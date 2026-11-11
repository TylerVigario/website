/**
 * Asserts every installed dependency with an install script has been
 * reviewed: approved or denied in package.json#allowScripts. And that
 * the policy reviews nothing that is not there.
 *
 * An install script is code a dependency runs on the installing machine,
 * before anything else here gets a say. npm 11 runs unreviewed ones and
 * prints a warning nobody reads; npm 12 blocks them. Neither tells a
 * reviewer that an update just brought a new one in, or that an approval
 * pinned to one version no longer covers the version installed. This
 * fails on both, so the decision is made in a commit rather than by
 * whichever npm happens to run.
 *
 * The policy itself: fsevents is denied, because it ships its binary
 * ready-made and the script only repeats that work. Nothing is approved.
 * better-sqlite3 is native but runs nothing at install: it ships its
 * binaries prebuilt, and since 13.0.2 has no install script and sets
 * `gypfile: false`, so npm does not build its binding.gyp either. Every
 * build and test passes with all install scripts off.
 *
 * It asks npm rather than reading the lockfile, because npm decides from
 * the installed packages themselves, as it does when it runs them: their
 * scripts, and a binding.gyp it would build.
 *
 * And an entry for an installed package with no install script fails,
 * because it reviews nothing and reads as though it did. That is how
 * better-sqlite3 stayed approved for a script it no longer had. `npm
 * install-scripts prune --dry-run` calls those `no-scripts`. What it
 * calls `not-installed` passes, because what is installed depends on the
 * platform: fsevents is installed only on macOS, where its denial is
 * needed.
 *
 * It passes only on npm's answers: exit 0 and the list it was asked for.
 * npm reports its own failure as JSON too, `{"error": ...}` with exit 1,
 * and a check reading only for the list found none in it and printed
 * "reviewed". That happened whenever npm refused to run, as it does with
 * `global` or `allow-scripts` set in the environment. Anything but the
 * list fails here. An npm without the command, before 11.18, is SKIPPED
 * locally and a failure in CI, as lint-actions.ts treats a missing
 * shellcheck.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const inCI = process.env.CI === "true";

const npm = (args: string[]) =>
  spawnSync("npm", args, {
    encoding: "utf8",
    // npm is npm.cmd on Windows, which only a shell can start.
    shell: process.platform === "win32",
  });

/** npm's answer to `npm install-scripts <command> --json`: what it found,
 *  under `allowScripts`, or, when it could not run the command, why. */
interface Answer {
  allowScripts?: unknown;
  error?: { code?: string; summary?: string };
}

/** Each package whose install script allowScripts does not yet cover. */
type Pending = { changes: { key: string }[] }[];

/** Each entry `prune` would drop, and why. */
interface Prunable {
  removed: { key: string; reason: string }[];
}

/** Asks npm and returns what it found. Anything but exit 0 and the shape
 *  asked for ends the check. */
const ask = <T>(args: string[], expected: (found: unknown) => found is T): T => {
  const command = `npm install-scripts ${args.join(" ")}`;
  const run = npm(["install-scripts", ...args, "--json"]);
  if (run.error) {
    console.error(
      `error: npm could not be run, so no install script was checked: ${run.error.message}`,
    );
    process.exit(1);
  }

  let answer: Answer | undefined;
  try {
    answer = JSON.parse(run.stdout) as Answer;
  } catch {
    // Not JSON. Failed below, as an error is.
  }
  const found = answer?.allowScripts;
  if (run.status === 0 && expected(found)) return found;

  const version = npm(["--version"]).stdout.trim();
  const [major = 0, minor = 0] = version.split(".").map(Number);
  if (major < 11 || (major === 11 && minor < 18)) {
    if (inCI) {
      console.error(`error: npm ${version} has no \`install-scripts\`, so nothing was checked.`);
      process.exit(1);
    }
    console.warn(
      `  SKIPPED  npm ${version} has no \`install-scripts\` — install scripts were NOT checked.`,
    );
    process.exit(0);
  }
  const said = answer?.error
    ? `${answer.error.code ?? "error"}: ${answer.error.summary ?? ""}`
    : ((run.stderr || run.stdout).trim().split("\n")[0] ?? "");
  console.error(
    `error: \`${command}\` failed (exit ${run.status ?? run.signal}), so the check could not finish:`,
  );
  console.error(`  ${said}`);
  process.exit(1);
};

const pending = ask(["ls"], (found): found is Pending => Array.isArray(found));
if (pending.length > 0) {
  console.error("error: install scripts not covered by package.json#allowScripts:");
  for (const { changes } of pending) {
    for (const { key } of changes) console.error(`  ${key}`);
  }
  console.error("");
  console.error("Read what each script does, then record the decision:");
  console.error("  npm install-scripts approve <pkg>   if it is needed (pins the version)");
  console.error("  npm install-scripts deny <pkg>      if it is not");
  process.exit(1);
}

const prunable = ask(["prune", "--dry-run"], (found): found is Prunable =>
  Array.isArray((found as Partial<Prunable> | undefined)?.removed),
);
const empty = prunable.removed.filter(({ reason }) => reason === "no-scripts");
if (empty.length > 0) {
  console.error("error: package.json#allowScripts reviews packages that have no install script:");
  for (const { key } of empty) console.error(`  ${key}`);
  console.error("");
  console.error("Each entry covers nothing. Remove it from package.json; if a later version");
  console.error("brings a script, this check names it for review.");
  process.exit(1);
}

const { allowScripts: policy = {} } = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  allowScripts?: Record<string, boolean>;
};
const approved = Object.keys(policy).filter((k) => policy[k] === true);
const denied = Object.keys(policy).filter((k) => policy[k] === false);
console.log(
  `  install scripts reviewed: approved ${approved.join(", ") || "none"}; denied ${denied.join(", ") || "none"}`,
);
