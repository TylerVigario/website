/**
 * Answers one question: is the installed tree still exactly what was
 * released?
 *
 * The authority is the retained tarball — the same artifact the install
 * came from, kept on disk — and its attestation. Nothing on the host is
 * trusted on its own account: the archive is re-proved against Sigstore
 * on every run, and only then is the manifest read out of it. A file
 * sitting beside the tree it vouches for can be edited alongside the
 * very file it was supposed to catch, so it never gets the last word.
 *
 * Re-proving a local file costs no bandwidth worth counting. The digest
 * is computed here; only the attestation bundle is fetched. There is no
 * reason to re-download an artifact already on disk.
 *
 * The comparison runs in BOTH directions. Changed and missing files are
 * the obvious half. The half that matters more is files present on disk
 * that the release never contained — nothing legitimate writes into a
 * release tree, provided mutable state is kept outside it, which is the
 * deployment's job and not this script's.
 *
 * Exit codes are the alerting contract:
 *   0  verified — attestation good, tree matches
 *   1  MISMATCH — the tree is not what was released
 *   2  fatal — cannot check at all
 *   3  DEGRADED — attestation could not be checked (offline), compared
 *      against the local archive anyway and saying so loudly
 *
 * Anything non-zero is worth waking up for. 3 says "I could not really
 * check", never "everything is fine".
 *
 * Usage:
 *   node verify-install.mjs --root <dir> --tarball <artifact> --repo <owner/name>
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** The comparison, kept pure so it can be tested without a network or a
 *  filesystem. Both directions: what changed, what vanished, and what
 *  appeared that the release never contained. */
export function compare(expected, onDisk) {
  const changed = [];
  const missing = [];
  const unexpected = [];
  for (const [rel, hash] of expected) {
    if (!onDisk.has(rel)) missing.push(rel);
    else if (onDisk.get(rel) !== hash) changed.push(rel);
  }
  for (const rel of onDisk.keys()) if (!expected.has(rel)) unexpected.push(rel);
  return { changed, missing, unexpected };
}

/** Parses sha256sum-format text into rel-path -> digest. */
export function parseManifest(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line.trim());
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

// Importing this file for its functions must not run the CLI.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n, d) => {
    const i = process.argv.indexOf(`--${n}`);
    return i === -1 ? d : process.argv[i + 1];
  };
  const root = arg("root");
  const tarball = arg("tarball");
  const repo = arg("repo");
  if (!root || !tarball || !repo) {
    console.error(
      "usage: verify-install.mjs --root <dir> --tarball <artifact> --repo <owner/name>",
    );
    console.error("");
    console.error("All three are deployment facts, so none is guessed. A default would");
    console.error("make this script assert where a release lives, which is not its call.");
    process.exit(2);
  }
  for (const [what, p] of [
    ["install root", root],
    ["retained artifact", tarball],
  ]) {
    if (!fs.existsSync(p)) {
      console.error(`FAIL  ${what} not found: ${p}`);
      process.exit(2);
    }
  }

  const run = (cmd, args) =>
    execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  console.log(`  installed: ${path.resolve(root)}`);
  console.log(`  artifact:  ${path.resolve(tarball)}`);

  // The archive earns its authority here, or it does not get any.
  let degraded = false;
  let why = "";
  try {
    run("gh", ["attestation", "verify", tarball, "--repo", repo]);
    console.log("  attestation: verified against the release workflow");
  } catch (e) {
    why = (e.stderr || e.message || "").trim().split("\n")[0];
    degraded = true;
    console.error("");
    console.error("  #########################################################");
    console.error("  #  DEGRADED - the artifact's origin could not be proved #");
    console.error("  #########################################################");
    console.error(`  ${why}`);
    console.error("  Comparing against the local archive regardless, which shows");
    console.error("  whether the install still matches THAT FILE — not whether");
    console.error("  that file is genuinely what the release published.");
    console.error("");
  }

  // Read the manifest out of the archive, never off the installed tree.
  let manifestText;
  try {
    const inner = path.basename(tarball).replace(/\.tar\.gz$/, "");
    manifestText = run("tar", ["-xzOf", tarball, `${inner}/MANIFEST.sha256`]);
  } catch {
    console.error(`FAIL  ${tarball} contains no MANIFEST.sha256`);
    process.exit(2);
  }

  const expected = parseManifest(manifestText);
  if (expected.size === 0) {
    console.error("FAIL  the manifest is empty or unparseable");
    process.exit(2);
  }

  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isSymbolicLink()) return [];
      if (e.isDirectory()) return walk(full);
      return e.isFile() ? [full] : [];
    });

  const onDisk = new Map();
  for (const f of walk(root)) {
    const rel = path.relative(root, f).split(path.sep).join("/");
    if (rel === "MANIFEST.sha256") continue;
    onDisk.set(rel, createHash("sha256").update(fs.readFileSync(f)).digest("hex"));
  }

  const { changed, missing, unexpected } = compare(expected, onDisk);

  console.log(`  compared:  ${expected.size} released / ${onDisk.size} on disk`);

  if (changed.length || missing.length || unexpected.length) {
    for (const [label, list] of [
      ["MODIFIED", changed],
      ["MISSING", missing],
      ["UNEXPECTED — on disk, not in the release", unexpected],
    ]) {
      if (!list.length) continue;
      console.error(`\n  ${label} (${list.length}):`);
      for (const f of list.slice(0, 25)) console.error(`    ${f}`);
      if (list.length > 25) console.error(`    … and ${list.length - 25} more`);
    }
    console.error(`\nMISMATCH  ${root} is not what the artifact contains.`);
    process.exit(1);
  }

  if (degraded) {
    console.error(`\nDEGRADED  ${root} matches the local artifact, origin unproven.`);
    console.error(`          Reason: ${why}`);
    process.exit(3);
  }
  console.log(`\nOK  ${root} matches ${path.basename(tarball)}, whose origin is proven.`);
}
