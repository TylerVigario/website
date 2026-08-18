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
 * If GitHub cannot be reached, the answer is UNVERIFIED, not OK. A
 * check that passes when it could not actually check is worse than no
 * check, because it produces confidence rather than an alarm.
 *
 * Usage:
 *   node verify-install.mjs                      # /opt/vigario-website/current
 *   node verify-install.mjs --root /path/to/tree
 *   node verify-install.mjs --version 1.2.3      # override what RELEASE claims
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO = "TylerVigario/website";

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

  const root = path.resolve(arg("root", "/opt/vigario-website/current"));
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
  } catch (e) {
    const why = (e.stderr || e.message || "").trim().split("\n")[0];
    console.error(`UNVERIFIED  could not fetch the manifest for ${tag} from ${REPO}`);
    console.error(`            ${why}`);
    console.error(`            This is not a pass. Either the release does not exist,`);
    console.error(`            or this host cannot reach GitHub.`);
    process.exit(3);
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
    console.error(`\nFAIL  ${root} does not match ${tag} as published.`);
    process.exit(1);
  }

  console.log(`\nOK  ${root} matches ${tag} byte for byte.`);
}
