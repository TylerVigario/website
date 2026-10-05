/**
 * Proves a release tarball runs, before anything is signed or published.
 *
 * The build proves the source compiles and check:forms proves the built
 * server takes submissions. Neither touches the artifact: the tarball is
 * assembled afterwards, from a fresh install of the runtime externals
 * with every prebuilt binary but one deleted, and a mistake in that
 * assembly (a missing file, the wrong native binary, a manifest that does
 * not describe the tree) used to be discovered by the host, at install,
 * after the release was already permanent.
 *
 * So this unpacks the tarball the way the host does and checks:
 *   - every file matches MANIFEST.sha256, and no file is missing from it
 *   - RELEASE and package.json name the same version
 *   - the unpacked server, with its own node_modules, passes check:forms
 *
 * The last runs scripts/check-forms.mjs from inside the unpacked tree, so
 * the server it boots is the artifact's, loading the artifact's copy of
 * better-sqlite3. The artifact carries the linux-x64 binary only, so this
 * runs where the artifact runs and nowhere else: CI, not a developer's
 * machine.
 *
 * Usage: node scripts/check-release.mjs dist-release/vigario-website-1.2.3.tar.gz
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tarball = process.argv[2];
if (!tarball || !existsSync(tarball)) {
  console.error("usage: node scripts/check-release.mjs <release tarball>");
  process.exit(1);
}

const dir = mkdtempSync(path.join(tmpdir(), "vts-release-"));
/** @type {string[]} */
const failures = [];
/** @param {string} msg */
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};

try {
  execFileSync("tar", ["-xzf", path.resolve(tarball), "-C", dir]);
  const [top, ...extra] = readdirSync(dir);
  if (!top) throw new Error(`${tarball} is empty`);
  if (extra.length) fail(`the tarball has ${extra.length + 1} top-level entries, not one`);
  const root = path.join(dir, top);
  console.log(`Release ${path.basename(tarball)}, unpacked:`);

  // The manifest, both ways: every listed file has its hash, and every
  // file is listed. `sha256sum -c` checks only the first.
  const listed = new Map(
    readFileSync(path.join(root, "MANIFEST.sha256"), "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, ...name] = line.split("  ");
        return [name.join("  "), hash];
      }),
  );
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(root, path.join(e.parentPath, e.name)).split(path.sep).join("/"))
    .filter((f) => f !== "MANIFEST.sha256");
  let bad = 0;
  for (const f of files) {
    const want = listed.get(f);
    const got = createHash("sha256")
      .update(readFileSync(path.join(root, f)))
      .digest("hex");
    if (want !== got) {
      bad++;
      fail(want ? `${f} does not match its hash` : `${f} is not in the manifest`);
    }
  }
  for (const f of listed.keys()) if (!files.includes(f)) fail(`${f} is listed but missing`);
  if (!bad && files.length === listed.size) {
    console.log(`  ✓ all ${files.length} files match MANIFEST.sha256, and none is unlisted`);
  }

  const release = Object.fromEntries(
    readFileSync(path.join(root, "RELEASE"), "utf8")
      .trim()
      .split("\n")
      .map((l) => l.split("=")),
  );
  const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (release.version === version && release.dirty === "false") {
    console.log(`  ✓ RELEASE and package.json both say ${version}, built from a clean tree`);
  } else {
    fail(`RELEASE says ${release.version} (dirty=${release.dirty}), package.json ${version}`);
  }

  // check-forms resolves the server from its working directory and its
  // own imports from where it lives, so run from here it boots the
  // artifact and reads the database with the repository's driver.
  const checkForms = fileURLToPath(new URL("./check-forms.mjs", import.meta.url));
  try {
    execFileSync(process.execPath, [checkForms], { cwd: root, stdio: "inherit" });
  } catch {
    fail("the unpacked server failed check:forms");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} release check(s) failed.`);
  process.exit(1);
}
console.log("\nThe artifact unpacks, matches its manifest, and serves both forms.");
