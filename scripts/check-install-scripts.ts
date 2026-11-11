/**
 * Asserts every installed dependency with an install script has been
 * reviewed: approved or denied in package.json#allowScripts.
 *
 * An install script is code a dependency runs on the installing machine,
 * before anything else here gets a say. npm 11 runs unreviewed ones and
 * prints a warning nobody reads; npm 12 blocks them. Neither tells a
 * reviewer that an update just brought a new one in, or that an approval
 * pinned to one version no longer covers the version installed. This
 * fails on both, so the decision is made in a commit rather than by
 * whichever npm happens to run.
 *
 * The policy itself: better-sqlite3 is approved, pinned to the reviewed
 * version, because its script is the compile-from-source fallback for a
 * platform without a bundled binary. fsevents is denied, because it
 * ships its binary ready-made and the script only repeats that work.
 * Every build and test passes with all install scripts off.
 *
 * That script is npm's, not the package's. Since 13.0.2 better-sqlite3
 * declares no install script and sets `gypfile: false`, and npm still
 * infers `node-gyp rebuild` from its binding.gyp on an install from the
 * lockfile, because a lockfile entry does not record `gypfile`
 * (npm/cli#9837). So the approval is live, though the package's own
 * package.json reads as if it covers nothing. Measured with `npm ci`
 * through a script shell that ran nothing: npm 11.19 runs the script
 * either way, and npm 12.2 runs it approved and blocks it otherwise.
 *
 * It asks npm rather than reading the lockfile, because the lockfile's
 * hasInstallScript flag misses better-sqlite3, whose script npm infers
 * from its binding.gyp. npm reads the installed tree from its hidden
 * lockfile only while that is newer than every folder in node_modules.
 * Once the tests, `astro sync` or a build have written caches there, npm
 * reads each package.json instead and sees no script for better-sqlite3.
 * So a stale pin fails in CI, whose tree is fresh, and can pass on a tree
 * they have run in.
 *
 * It passes only on npm's answer: exit 0 and the list of what
 * allowScripts does not cover. npm reports its own failure as JSON too,
 * `{"error": ...}` with exit 1, and a check reading only for the list
 * found none in it and printed "reviewed". That happened whenever npm
 * refused to run, as it does with `global` or `allow-scripts` set in the
 * environment. Anything but the list fails here. An npm without the
 * command, before 11.18, is SKIPPED locally and a failure in CI, as
 * lint-actions.ts treats a missing shellcheck.
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

/** What `npm install-scripts ls --json` reports: each package whose
 *  install script package.json#allowScripts does not yet cover, or, when
 *  npm could not run the command, why. */
interface Report {
  allowScripts?: { changes: { key: string }[] }[];
  error?: { code?: string; summary?: string };
}

const run = npm(["install-scripts", "ls", "--json"]);
if (run.error) {
  console.error(
    `error: npm could not be run, so no install script was checked: ${run.error.message}`,
  );
  process.exit(1);
}

let report: Report | undefined;
try {
  report = JSON.parse(run.stdout) as Report;
} catch {
  // Not JSON. Failed below, as an error is.
}

const pending = run.status === 0 ? report?.allowScripts : undefined;
if (!Array.isArray(pending)) {
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
  const said = report?.error
    ? `${report.error.code ?? "error"}: ${report.error.summary ?? ""}`
    : ((run.stderr || run.stdout).trim().split("\n")[0] ?? "");
  console.error(
    `error: \`npm install-scripts ls\` failed (exit ${run.status ?? run.signal}), so nothing was checked:`,
  );
  console.error(`  ${said}`);
  process.exit(1);
}

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

const { allowScripts: policy = {} } = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  allowScripts?: Record<string, boolean>;
};
const approved = Object.keys(policy).filter((k) => policy[k] === true);
const denied = Object.keys(policy).filter((k) => policy[k] === false);
console.log(
  `  install scripts reviewed: approved ${approved.join(", ") || "none"}; denied ${denied.join(", ") || "none"}`,
);
