/**
 * Runs actionlint over .github/workflows as part of the local gate.
 *
 * This was the one check with no local equivalent, so workflow mistakes
 * could only be discovered by pushing — which is how a shellcheck
 * style complaint took a round trip through CI.
 *
 * actionlint comes from npm, as @kjanat/actionlint: the maintained fork,
 * since the original stopped releasing at 1.7.12. Each platform's binary
 * is a package of its own rather than an install script's download, so
 * `npm ci --ignore-scripts` installs it, and every clone runs the version
 * CI runs. One that cannot run it fails here rather than skipping: a
 * check that succeeds without checking manufactures confidence, which is
 * worse than not having it.
 *
 * shellcheck is not packaged that way, so it is found on PATH, and its
 * absence is SKIPPED and loud locally and a failure in CI. actionlint
 * runs it over every `run:` block when it can find it and says nothing
 * at all when it cannot, so a machine without shellcheck printed "clean"
 * having checked none of the shell. The result now says which it was.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const inCI = process.env.CI === "true";

// The package's own launcher, run by this Node, finds the binary for this
// platform. Run that way rather than through node_modules/.bin, the same
// call works on Windows.
const pkg = createRequire(import.meta.url).resolve("@kjanat/actionlint/package.json");
const launcher = path.join(path.dirname(pkg), "bin", "actionlint.mjs");

if (!fs.existsSync(".github/workflows")) process.exit(0);

const found = (cmd: string) => {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const shellcheck = found("shellcheck");
if (!shellcheck) {
  if (inCI) {
    console.error("error: shellcheck is not installed, so actionlint would skip every run: block.");
    process.exit(1);
  }
  console.warn(
    "  SKIPPED  shellcheck is not installed — the shell in run: blocks was NOT checked.",
  );
  console.warn("           actionlint skips that pass silently when it cannot find shellcheck.");
}

try {
  execFileSync(process.execPath, [launcher], { stdio: "inherit" });
  console.log(
    shellcheck
      ? "  actionlint: clean, shell included"
      : "  actionlint: clean, WITHOUT the shell checks",
  );
} catch {
  process.exit(1);
}
