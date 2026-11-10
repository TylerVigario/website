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
 *   - it carries the licence of every package the server bundles
 *   - the unpacked server, with its own node_modules, passes check:forms
 *
 * The last runs scripts/check-forms.ts from inside the unpacked tree, so
 * the server it boots is the artifact's, loading the artifact's copy of
 * better-sqlite3. The artifact carries the linux-x64 binary only, so this
 * runs where the artifact runs and nowhere else: CI, not a developer's
 * machine.
 *
 * Usage: node scripts/check-release.ts dist-release/vigario-website-1.2.3.tar.gz
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Bundled packages that publish no licence text to carry, with why. One
// that gains a text fails the check, as does one no longer bundled, so
// an entry here cannot outlive its reason.
const NO_LICENCE_TEXT = new Map([
  // astro's terminal colours. Its package.json says ISC, but neither the
  // package nor its repository (delucis/piccolore) has a licence file or
  // a copyright line, so there is no notice to copy.
  ["piccolore", "its package and repository have no licence file"],
]);

const tarball = process.argv[2];
if (!tarball || !existsSync(tarball)) {
  console.error("usage: node scripts/check-release.ts <release tarball>");
  process.exit(1);
}

const dir = mkdtempSync(path.join(tmpdir(), "vts-release-"));
const failures: string[] = [];
const fail = (msg: string) => {
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

  const release: Record<string, string> = Object.fromEntries(
    readFileSync(path.join(root, "RELEASE"), "utf8")
      .trim()
      .split("\n")
      .map((l) => {
        const at = l.indexOf("=");
        return [l.slice(0, at), l.slice(at + 1)] as const;
      }),
  );
  const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    version: string;
  };
  if (release.version === version && release.dirty === "false") {
    console.log(`  ✓ RELEASE and package.json both say ${version}, built from a clean tree`);
  } else {
    fail(`RELEASE says ${release.version} (dirty=${release.dirty}), package.json ${version}`);
  }

  // The licences of what the server bundles, which build.license writes
  // (astro.config.ts). This is what notices that stopping, or a bundled
  // package with no licence text to copy.
  const licences = path.join(root, "dist/server/THIRD-PARTY-LICENSES.md");
  if (!existsSync(licences)) {
    fail("dist/server/THIRD-PARTY-LICENSES.md is missing");
  } else {
    const entries = readFileSync(licences, "utf8")
      .split(/^## /m)
      .slice(1)
      .map((e) => {
        const [heading = "", ...text] = e.split("\n");
        return { name: heading.split(" - ")[0] ?? heading, text: text.join("\n").trim() };
      });
    const names = new Set(entries.map((e) => e.name));
    for (const { name, text } of entries) {
      if (!text && !NO_LICENCE_TEXT.has(name)) fail(`${name} is bundled with no licence text`);
      if (text && NO_LICENCE_TEXT.has(name)) {
        fail(`${name} now has a licence text; take it out of NO_LICENCE_TEXT`);
      }
    }
    for (const name of NO_LICENCE_TEXT.keys()) {
      if (!names.has(name)) fail(`${name} is no longer bundled; take it out of NO_LICENCE_TEXT`);
    }
    if (!entries.length) fail("THIRD-PARTY-LICENSES.md lists no packages");
    else if (entries.every((e) => e.text || NO_LICENCE_TEXT.has(e.name))) {
      const but = [...NO_LICENCE_TEXT].map(([name, why]) => `, but ${name}: ${why}`).join("");
      console.log(
        `  ✓ ${entries.length} bundled packages listed, each with its licence text${but}`,
      );
    }
  }

  // check-forms resolves the server from its working directory and its
  // own imports from where it lives, so run from here it boots the
  // artifact and reads the database with the repository's driver.
  const checkForms = fileURLToPath(new URL("./check-forms.ts", import.meta.url));
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
console.log(
  "\nThe artifact unpacks, matches its manifest, carries its licences, and serves both forms.",
);
