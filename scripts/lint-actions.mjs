/**
 * Runs actionlint over .github/workflows as part of the local gate.
 *
 * This was the one check with no local equivalent, so workflow mistakes
 * could only be discovered by pushing — which is how a shellcheck
 * style complaint took a round trip through CI. actionlint is a Go
 * binary with no usable npx wrapper, so it is found rather than
 * installed by npm.
 *
 * When it is not installed the result is SKIPPED and loud, never a
 * silent pass. A check that succeeds without checking manufactures
 * confidence, which is worse than not having it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const candidates = [
  "actionlint",
  path.join(os.homedir(), ".local/bin/actionlint"),
  "/usr/local/bin/actionlint",
];

let bin = null;
for (const c of candidates) {
  try {
    execFileSync(c, ["--version"], { stdio: "ignore" });
    bin = c;
    break;
  } catch {
    /* try the next one */
  }
}

if (!bin) {
  console.warn("  SKIPPED  actionlint is not installed — workflows were NOT linted.");
  console.warn("           CI still runs it, so a workflow mistake will surface there instead.");
  console.warn("           Install it to catch those before pushing:");
  console.warn(
    "             curl -sSfL https://raw.githubusercontent.com/rhysd/actionlint/v1.7.12/scripts/download-actionlint.bash \\",
  );
  console.warn('               | bash -s -- 1.7.12 "$HOME/.local/bin"');
  process.exit(0);
}

if (!fs.existsSync(".github/workflows")) process.exit(0);

try {
  execFileSync(bin, { stdio: "inherit" });
  console.log("  actionlint: clean");
} catch {
  process.exit(1);
}
