/**
 * Builds the release artifact: one self-contained tarball the host can
 * extract and run with no toolchain, no network, and no build step.
 *
 * WHY SELF-CONTAINED. The deploy target is a box that should hold no
 * runner and no build tooling. If the host had to run `npm ci` it would
 * need a network path to the registry and a compiler for anything
 * native, and a deploy could fail for reasons that have nothing to do
 * with the code being deployed. Shipping node_modules inside the
 * artifact moves every one of those failure modes to CI, where a
 * failure blocks the release instead of breaking the running site.
 *
 * WHY THAT IS SAFE ACROSS DISTROS. The only native dependency is
 * better-sqlite3, which since v13 is built on the N-API and ships
 * prebuilt binaries for every platform inside the published package —
 * linux-x64 among them. So node_modules assembled on an Ubuntu runner
 * carries the same binary a Fedora host would have downloaded, and
 * N-API keeps it valid across Node majors. Verified by asserting the
 * prebuild is present in the staged tree before packing; if that ever
 * stops being true this script fails rather than shipping something
 * that cannot open its database.
 *
 * Usage:
 *   node scripts/make-release.mjs                 # version from package.json
 *   node scripts/make-release.mjs --version 1.2.3
 *   node scripts/make-release.mjs --out /tmp/dir
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { RUNTIME_EXTERNALS } from "../runtime-externals.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = arg("version", pkg.version);
const outDir = path.resolve(arg("out", "dist-release"));
const name = `vigario-website-${version}`;
const staging = path.join(outDir, name);

// A release must be reproducible from a known commit. If the tree is
// dirty the tarball would contain changes no commit records, which
// makes "which code is on prod" unanswerable later.
const commit = run("git", ["rev-parse", "HEAD"]).trim();
const dirty = run("git", ["status", "--porcelain"]).trim();
if (dirty && !process.argv.includes("--allow-dirty")) {
  console.error("error: working tree is dirty — a release must be traceable to a commit.");
  console.error(dirty.split("\n").slice(0, 10).join("\n"));
  console.error("Pass --allow-dirty only when proving the machinery locally.");
  process.exit(1);
}

console.log(`building ${name} from ${commit.slice(0, 8)}${dirty ? " (DIRTY)" : ""}`);

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

// The build must exist and must be current. Rebuilding here rather than
// trusting whatever dist/ happens to hold keeps the artifact honest.
console.log("  astro build");
run("npx", ["astro", "build"], { stdio: "inherit" });

fs.cpSync("dist", path.join(staging, "dist"), { recursive: true });

// The artifact gets its OWN minimal manifest rather than a copy of the
// repo's. Copying the real one would list every build dependency, and
// `npm install` in this directory would then resolve all of them —
// reinstating the 200 MB tree this whole approach exists to avoid.
fs.writeFileSync(
  path.join(staging, "package.json"),
  JSON.stringify({ name: pkg.name, version, private: true, type: "module" }, null, 2) + "\n",
);

// Install ONLY what the server bundle actually imports at runtime.
//
// `npm ci --omit=dev` installs 199 MB, almost all of it Astro's build
// toolchain — rolldown, vite, esbuild, shiki, lightningcss, sharp —
// pulled in because `astro` is a runtime dependency. None of it is
// reachable from the built server: with `ssr.noExternal` the bundle
// carries its own code and leaves only genuinely external modules as
// bare imports.
//
// So rather than install everything and try to prune, read the answer
// off the artifact itself: scan the emitted server for bare specifiers
// and install exactly those, at the versions the lockfile pins. If a
// future dependency has to stay external, it appears here on its own —
// nothing to remember to update.
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const pinned = RUNTIME_EXTERNALS.map((name) => {
  const entry = lock.packages?.[`node_modules/${name}`];
  if (!entry?.version) {
    console.error(`error: ${name} is imported by the server bundle but absent from the lockfile.`);
    process.exit(1);
  }
  return `${name}@${entry.version}`;
});
console.log(`  runtime externals: ${pinned.join(", ") || "(none)"}`);

// --ignore-scripts because a release build should not execute package
// lifecycle scripts, and nothing here needs them: better-sqlite3 ships
// its prebuilt binaries inside the published package rather than
// fetching one in a postinstall. The assertion below fails the build if
// that ever stops being true.
if (pinned.length) {
  run("npm", ["install", ...pinned, "--ignore-scripts", "--no-audit", "--no-fund", "--no-save"], {
    cwd: staging,
    stdio: "inherit",
  });
}

// Fail loudly rather than ship an artifact whose database driver cannot
// load on the target. See the header note on why this is the one thing
// that could silently differ between build host and deploy host.
const prebuild = path.join(staging, "node_modules/better-sqlite3/prebuilds/linux-x64.node");
if (!fs.existsSync(prebuild)) {
  console.error(
    `error: ${prebuild} missing — the artifact would not open its database on the host.`,
  );
  process.exit(1);
}

// better-sqlite3 publishes prebuilt binaries for eight platforms and
// npm installs all of them. Seven cannot execute on the deploy target,
// so they are ~20 MB of an artifact that gets downloaded on every
// release. Dropping them is provably safe in a way that pruning
// ordinary packages is not: these are alternative copies of the same
// module, not code some path might reach.
const prebuildDir = path.dirname(prebuild);
for (const f of fs.readdirSync(prebuildDir)) {
  if (f !== "linux-x64.node") fs.rmSync(path.join(prebuildDir, f), { recursive: true });
}

// The changelog ships inside the artifact. RELEASE pins WHICH commit
// this is; the changelog says what that commit changed — and says it
// without a network path back to the release notes, which is the same
// reason the tarball carries its own node_modules rather than assuming
// the host can reach a registry.
//
// It has to be the regenerated one. The release workflow rewrites
// CHANGELOG.md before this script runs, so the copy taken here is
// current; a build from a tree where that rewrite had been reverted
// would ship a changelog stopping one version short of the artifact
// describing itself.
// --changelog points somewhere other than the tree when the caller has
// a regenerated one the tree does not carry yet. The release workflow
// builds BEFORE it writes anything to the repository, so at build time
// the new changelog exists only as a file the previous step produced.
// Passing it here is what lets the working tree stay clean — and the
// clean tree is what keeps the guard above strict rather than something
// the release has to be excused from.
const changelogSrc = arg("changelog", "CHANGELOG.md");
if (!fs.existsSync(changelogSrc)) {
  console.error(`error: ${changelogSrc} is missing — the artifact would ship without its history.`);
  process.exit(1);
}
fs.copyFileSync(changelogSrc, path.join(staging, "CHANGELOG.md"));

// Identity, so the running site can be traced back to a commit without
// guessing from a version number that may have been reused.
//
// `commit` is the commit whose SOURCE produced these bytes, which during
// a release is the parent of the commit the tag points at — the release
// commit adds the version bump and the changelog on top of this tree and
// changes nothing that gets compiled. It is recorded rather than the
// tagged commit because the tagged commit does not exist yet: the
// workflow builds and attests before it writes anything, so that a
// failure leaves no tag, no release and no bumped branch behind.
// `git rev-parse <tag>^` recovers it from the other direction.
fs.writeFileSync(
  path.join(staging, "RELEASE"),
  [
    `version=${version}`,
    `commit=${commit}`,
    `built_on=${os.platform()}-${os.arch()}`,
    `node=${process.version}`,
    dirty ? "dirty=true" : "dirty=false",
    "",
  ].join("\n"),
);

// Per-file manifest. This is what makes "is the installed site still
// what was built" answerable at any time, rather than only at download.
//
// An attestation covers the tarball's digest, which proves the download
// was genuine and says nothing about the extracted tree afterwards —
// and the extracted tree is what actually serves. Drift there (a
// half-finished deploy, corruption, a dropped-in file) is invisible to
// a whole-archive checksum.
//
// The manifest is written into the artifact AND published beside it as
// its own release asset. The release copy is the authoritative one:
// anything on the host is exactly as suspect as the files it would be
// vouching for, so verification compares the installed tree against
// GitHub, never against another local file.
//
// sha256sum's own format, so `sha256sum -c` works on it directly.
function manifestLines(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const full = path.join(dir, e.name);
      // Symlinks are not followed: hashing through one would record the
      // target's bytes under the link's name and silently pass if the
      // link were later repointed.
      if (e.isSymbolicLink()) return [];
      if (e.isDirectory()) return manifestLines(full, base);
      if (!e.isFile()) return [];
      const rel = path.relative(base, full).split(path.sep).join("/");
      const hash = createHash("sha256").update(fs.readFileSync(full)).digest("hex");
      return [`${hash}  ${rel}`];
    })
    .sort();
}

const lines = manifestLines(staging);
// Sorted, so the manifest is byte-identical for identical trees and a
// diff between two versions is readable.
const manifest = lines.join("\n") + "\n";
// Inside the archive only. A copy published beside the tarball would be
// a second thing that can differ from the first, and "they disagree" is
// a state something then has to resolve — which is an invitation to
// re-fetch. The tarball's attestation already covers this file, so a
// separate copy adds no proof, only a way to be wrong.
fs.writeFileSync(path.join(staging, "MANIFEST.sha256"), manifest);
console.log(`  manifest: ${lines.length} files`);

const tarball = path.join(outDir, `${name}.tar.gz`);
fs.rmSync(tarball, { force: true });
run("tar", ["-czf", tarball, "-C", outDir, name]);

const size = fs.statSync(tarball).size;
console.log(`\n  ${tarball}`);
console.log(`  ${(size / 1024 / 1024).toFixed(1)} MB`);
console.log(`  entrypoint: dist/server/entry.mjs`);
