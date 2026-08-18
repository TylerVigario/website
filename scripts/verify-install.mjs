/**
 * Answers one question: is the installed site still exactly what was
 * built and published?
 *
 * The manifest is fetched from the GitHub release every run. Nothing on
 * the host is trusted to answer this, because anything on the host is
 * exactly as suspect as the files it would be vouching for — a manifest
 * sitting next to the tree it describes can be edited alongside the file
 * it was supposed to catch. The release is the root of trust; the local
 * copies are a rollback convenience.
 *
 * The comparison runs in BOTH directions. Changed files and missing
 * files are the obvious half; the half that matters more is files
 * present on disk that the manifest never listed. Nothing legitimate
 * writes into a release tree — the database lives in /var/lib, outside
 * it — so "zero unexpected files" is a clean assertion with no
 * exclusions to argue about.
 *
 * If GitHub cannot be reached it falls back to the manifest inside the
 * retained tarball, so a GitHub outage degrades the check instead of
 * blocking it. That fallback is strictly weaker — the tarball sits on
 * the same disk as the tree it vouches for, and anyone who can edit a
 * file can repack an archive — so it is never silent: it shouts in the
 * log and exits non-zero specifically so the alert fires.
 *
 * Exit codes, which are the alerting contract:
 *   0  verified against GitHub, tree matches
 *   1  MISMATCH — the tree is not what was published
 *   2  fatal — cannot run the check at all
 *   3  DEGRADED — GitHub unreachable, matched the local tarball instead
 *
 * Anything non-zero is worth waking up for; 3 says "I could not really
 * check" rather than "everything is fine".
 *
 * This tool knows about an ARTIFACT, not about a machine. Where a
 * release is installed, what runs it, and which repository publishes it
 * are all facts about a deployment, so they are arguments — there is no
 * default install path and no baked-in repository, because guessing
 * either would be this script asserting a deployment shape it has no
 * business having an opinion about.
 *
 * Usage:
 *   node verify-install.mjs --root <dir> --repo <owner/name>
 *   node verify-install.mjs --root <dir> --repo <owner/name> --version 1.2.3
 *   node verify-install.mjs --root <dir> --repo <owner/name> --tarball <path>
 *
 * --version overrides what the tree's RELEASE file claims.
 * --tarball is the fallback archive used when GitHub is unreachable.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** The comparison, kept pure so it can be tested without a network or a
 *  filesystem. Both directions: what changed, what vanished, and what
 *  appeared that was never published. */
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

/** Parses sha256sum-format text into rel-path → digest. */
export function parseManifest(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line.trim());
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

// Importing this file for its functions must not run the CLI.
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isCli) {
  /* imported for testing */
} else {
  const arg = (n, d) => {
    const i = process.argv.indexOf(`--${n}`);
    return i === -1 ? d : process.argv[i + 1];
  };

  const rootArg = arg("root");
  const REPO = arg("repo");
  if (!rootArg || !REPO) {
    console.error("usage: verify-install.mjs --root <install dir> --repo <owner/name>");
    console.error("       [--version X.Y.Z] [--tarball <path to retained artifact>]");
    console.error("");
    console.error("Both are deployment facts, so neither is guessed. A default would");
    console.error("make this script assert where a release lives, which is not its call.");
    process.exit(2);
  }
  const root = path.resolve(rootArg);
  // The manifest is the one file in the tree that cannot appear in its
  // own listing, so it is excluded from the unexpected-file check rather
  // than being reported as an intruder on every run.
  const SELF = "MANIFEST.sha256";

  function fail(msg, code = 2) {
    console.error(`FAIL  ${msg}`);
    process.exit(code);
  }

  if (!fs.existsSync(root)) fail(`${root} does not exist`);

  // The version is read from a file on disk, which makes it a claim
  // rather than a fact. That is self-correcting: if it has been edited to
  // name a different release, the tree will not match that release's
  // manifest either.
  let version = arg("version");
  if (!version) {
    const rel = path.join(root, "RELEASE");
    if (!fs.existsSync(rel)) fail(`no RELEASE file in ${root} and no --version given`);
    version = /^version=(.+)$/m.exec(fs.readFileSync(rel, "utf8"))?.[1]?.trim();
    if (!version) fail("RELEASE file has no version= line");
  }
  const tag = version.startsWith("v") ? version : `v${version}`;
  console.log(`  installed: ${root}`);
  console.log(`  claims:    ${tag}`);

  let published;
  let degraded = false;
  let why = "";
  try {
    published = execFileSync(
      "gh",
      [
        "release",
        "download",
        tag,
        "--repo",
        REPO,
        "--pattern",
        "*.MANIFEST.sha256",
        "--output",
        "-",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    console.log(`  source:    GitHub release ${tag} (authoritative)`);
  } catch (e) {
    why = (e.stderr || e.message || "").trim().split("\n")[0];
    // Fall back to the copy inside the retained tarball rather than the
    // loose MANIFEST.sha256 in the tree: forging that one means repacking
    // an archive, not editing a text file sitting next to its accuser.
    // No default path: how retained artifacts are laid out is the
    // deployment's business. Without --tarball there is simply no
    // fallback, and the run fails loudly rather than guessing.
    const tarball = arg("tarball");
    if (!tarball) {
      console.error(`FAIL  cannot verify ${tag}: GitHub unreachable (${why})`);
      console.error(`      and no --tarball given to fall back to.`);
      process.exit(2);
    }
    try {
      published = execFileSync(
        "tar",
        ["-xzOf", tarball, `vigario-website-${version}/MANIFEST.sha256`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      degraded = true;
      console.error("");
      console.error("  #########################################################");
      console.error("  #  DEGRADED - could not reach the authoritative source  #");
      console.error("  #########################################################");
      console.error(`  GitHub said: ${why}`);
      console.error(`  Falling back to the manifest inside ${tarball}.`);
      console.error("  That archive sits on the same disk as the tree it vouches");
      console.error("  for, so this proves the install is INTERNALLY consistent,");
      console.error("  not that it matches what was actually published.");
      console.error("");
    } catch {
      console.error(`FAIL  cannot verify ${tag}: GitHub unreachable (${why})`);
      console.error(`      and no local tarball at ${tarball} to fall back to.`);
      process.exit(2);
    }
  }

  const expected = parseManifest(published);
  if (expected.size === 0) fail(`the published manifest for ${tag} is empty or unparseable`);

  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isSymbolicLink()) return [];
      if (e.isDirectory()) return walk(full);
      return e.isFile() ? [full] : [];
    });

  const onDisk = new Map();
  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (rel === SELF) continue;
    onDisk.set(rel, createHash("sha256").update(fs.readFileSync(file)).digest("hex"));
  }

  const { changed, missing, unexpected } = compare(expected, onDisk);

  const report = (label, list) => {
    if (!list.length) return;
    console.error(`\n  ${label} (${list.length}):`);
    for (const f of list.slice(0, 25)) console.error(`    ${f}`);
    if (list.length > 25) console.error(`    … and ${list.length - 25} more`);
  };

  console.log(`  compared:  ${expected.size} published / ${onDisk.size} on disk`);

  if (changed.length || missing.length || unexpected.length) {
    report("MODIFIED", changed);
    report("MISSING", missing);
    report("UNEXPECTED — present on disk, not in the published release", unexpected);
    console.error(
      `\nMISMATCH  ${root} does not match ${tag}` +
        (degraded
          ? " (compared against the LOCAL tarball - GitHub was unreachable)"
          : " as published"),
    );
    process.exit(1);
  }

  if (degraded) {
    console.error(`\nDEGRADED  ${root} matches the local tarball for ${tag}.`);
    console.error(`          NOT confirmed against GitHub. Reason: ${why}`);
    process.exit(3);
  }
  console.log(`\nOK  ${root} matches ${tag} byte for byte, as published.`);
}
