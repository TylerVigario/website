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
 * confidence, which is worse than not having it. In CI the same absence
 * is a failure: CI is the authority this leniency defers to, so it may
 * not skip.
 *
 * shellcheck gets the same treatment. actionlint runs it over every
 * `run:` block when it can find it and says nothing at all when it
 * cannot, so a machine without shellcheck printed "clean" having checked
 * none of the shell. The result now says which it was.
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

const inCI = process.env.CI === "true";

const found = (cmd) => {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

if (!bin) {
  if (inCI) {
    console.error("error: actionlint is not installed. In CI that is a gate that checked nothing.");
    process.exit(1);
  }
  console.warn("  SKIPPED  actionlint is not installed — workflows were NOT linted.");
  console.warn("           CI still runs it, so a workflow mistake will surface there instead.");
  console.warn("           Install it to catch those before pushing — the same way CI does,");
  console.warn("           which is a pinned release asset rather than a piped remote script:");
  console.warn(
    "             v=1.7.12; f=actionlint_${v}_linux_amd64.tar.gz; mkdir -p ~/.local/bin",
  );
  console.warn(
    "             curl -sSfLO --retry 5 https://github.com/rhysd/actionlint/releases/download/v$v/$f",
  );
  console.warn('             tar -xzf "$f" -C ~/.local/bin actionlint');
  process.exit(0);
}

if (!fs.existsSync(".github/workflows")) process.exit(0);

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
  execFileSync(bin, { stdio: "inherit" });
  console.log(
    shellcheck
      ? "  actionlint: clean, shell included"
      : "  actionlint: clean, WITHOUT the shell checks",
  );
} catch {
  process.exit(1);
}
