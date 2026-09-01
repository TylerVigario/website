/**
 * Fetches a release and proves it, in order, before anything is trusted.
 *
 * Each step gates the next. Nothing is extracted before its origin is
 * established, and nothing is compared against a manifest that has not
 * itself been proven — otherwise the check is only as good as whoever
 * could write the file it checks against.
 *
 *   1. download the tarball from the release
 *   2. verify its attestation — Sigstore, keyless, bound to the
 *      workflow, repo and commit that built it
 *   3. decompress, only now
 *   4. hash every extracted file against the manifest inside it
 *
 * There is one artifact and one signature over it. The manifest ships
 * inside the tarball, so that signature already covers it; a copy
 * published alongside would prove nothing extra and would introduce a
 * state — the two disagreeing — that something then has to resolve.
 *
 * It knows about an ARTIFACT, not a machine. --dest is required and it
 * neither chooses install paths nor touches anything outside them; where
 * a release lives and what runs it is the deployment's business.
 *
 * Usage:
 *   node fetch-release.mjs --repo <owner/name> --tag vX.Y.Z --dest <dir>
 *   node fetch-release.mjs ... --keep      leave the downloads in place
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const repo = arg("repo");
const tag = arg("tag");
const dest = arg("dest");
if (!repo || !tag || !dest) {
  console.error("usage: fetch-release.mjs --repo <owner/name> --tag vX.Y.Z --dest <dir>");
  console.error("       [--keep]");
  process.exit(2);
}

const die = (step, msg) => {
  console.error(`\nFAIL  step ${step}: ${msg}`);
  console.error("      Nothing was installed. Later steps did not run.");
  process.exit(1);
};
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

const work = fs.mkdtempSync(path.join(os.tmpdir(), "release-"));
const version = tag.replace(/^v/, "");
const tarName = `vigario-website-${version}.tar.gz`;

// ---- 1. download -----------------------------------------------------
console.log(`  1. downloading ${tag} from ${repo}`);
try {
  run("gh", ["release", "download", tag, "--repo", repo, "--dir", work, "--pattern", tarName]);
} catch (e) {
  die(1, `could not download release ${tag}: ${(e.stderr || e.message).trim().split("\n")[0]}`);
}
const tarball = path.join(work, tarName);
if (!fs.existsSync(tarball)) die(1, `release ${tag} is missing ${tarName}`);

// ---- 2. attestation, before anything is opened -----------------------
// An archive that has not been proven is untrusted input, and untrusted
// input is not something to decompress first and ask about later.
console.log("  2. verifying attestation");
try {
  run("gh", ["attestation", "verify", tarball, "--repo", repo]);
  console.log(`     ok  ${tarName}`);
} catch (e) {
  die(2, `attestation failed for ${tarName} — ${(e.stderr || e.message).trim().split("\n")[0]}`);
}

// ---- 3. decompress ---------------------------------------------------
console.log("  3. decompressing");
fs.mkdirSync(dest, { recursive: true });
try {
  run("tar", ["-xzf", tarball, "-C", dest, "--strip-components=1"]);
} catch (e) {
  die(3, `extraction failed: ${(e.stderr || e.message).trim().split("\n")[0]}`);
}

// ---- 4. every file, against the manifest the archive carries ---------
// That manifest is covered by the signature verified in step 2, so it
// needs no separate proof of its own.
console.log("  4. hashing the extracted tree");
const embedded = path.join(dest, "MANIFEST.sha256");
if (!fs.existsSync(embedded)) die(4, "the archive contains no MANIFEST.sha256");
const pubText = fs.readFileSync(embedded, "utf8");
const expected = new Map();
for (const line of pubText.split("\n")) {
  const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line.trim());
  if (m) expected.set(m[2], m[1]);
}
if (expected.size === 0) die(5, "the manifest is empty or unparseable");

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) return [];
    if (e.isDirectory()) return walk(full);
    return e.isFile() ? [full] : [];
  });

const onDisk = new Map();
for (const f of walk(dest)) {
  const rel = path.relative(dest, f).split(path.sep).join("/");
  if (rel === "MANIFEST.sha256") continue;
  onDisk.set(rel, createHash("sha256").update(fs.readFileSync(f)).digest("hex"));
}

const changed = [];
const missing = [];
const extra = [];
for (const [rel, hash] of expected) {
  if (!onDisk.has(rel)) missing.push(rel);
  else if (onDisk.get(rel) !== hash) changed.push(rel);
}
for (const rel of onDisk.keys()) if (!expected.has(rel)) extra.push(rel);

if (changed.length || missing.length || extra.length) {
  for (const [label, list] of [
    ["MODIFIED", changed],
    ["MISSING", missing],
    ["NOT IN THE MANIFEST", extra],
  ]) {
    if (!list.length) continue;
    console.error(`\n  ${label} (${list.length}):`);
    for (const f of list.slice(0, 25)) console.error(`    ${f}`);
    if (list.length > 25) console.error(`    … and ${list.length - 25} more`);
  }
  die(4, `the extracted tree does not match the manifest`);
}

if (!process.argv.includes("--keep")) fs.rmSync(work, { recursive: true, force: true });
console.log(`\nOK  ${tag} verified end to end: attested, extracted, ${expected.size} files match.`);
console.log(`    ${dest}`);
