/**
 * Points git at the hooks this repository tracks, in .husky/.
 *
 * `npm ci` and `npm install` run this as `prepare`. git reads the path
 * relative to the working tree a hook runs in, and the folder is
 * tracked, so every worktree of a clone has the hooks. A worktree that
 * has not been set up refuses the commit or the push, because what the
 * hooks run is not installed there, rather than running no hook at all.
 *
 * Outside a git checkout, such as an unpacked source archive, there is
 * nothing to set, and the install carries on.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
if (inside.status !== 0 || inside.stdout.trim() !== "true") {
  console.log("install-hooks: no git checkout here, so no hooks to point at");
  process.exit(0);
}

const set = spawnSync("git", ["config", "core.hooksPath", ".husky"], { stdio: "inherit" });
if (set.status !== 0) {
  console.error("install-hooks: git config core.hooksPath .husky failed");
  process.exit(set.status ?? 1);
}

// What husky generated here when it ran the hooks. Nothing reads it now.
rmSync(".husky/_", { recursive: true, force: true });
