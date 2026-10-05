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
 * platform without a bundled binary. esbuild and fsevents are denied,
 * because each ships its binary ready-made and the script only repeats
 * that work. Every build and test passes with all install scripts off.
 *
 * It asks npm rather than reading the lockfile, because the lockfile's
 * hasInstallScript flag misses better-sqlite3, whose script npm infers
 * from its binding.gyp.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const run = spawnSync("npm", ["install-scripts", "ls", "--json"], {
  encoding: "utf8",
  // npm is npm.cmd on Windows, which only a shell can start.
  shell: process.platform === "win32",
});

/** What `npm install-scripts ls --json` reports: each package whose
 *  install script package.json#allowScripts does not yet cover. */
interface Report {
  allowScripts?: { changes: { key: string }[] }[];
}

let report: Report;
try {
  report = JSON.parse(run.stdout) as Report;
} catch {
  // An npm without the command (before 11.18) prints a usage error, not
  // JSON. Skip rather than fail: the gate runs the npm that ships with
  // the pinned Node, and that one has it.
  const version = spawnSync("npm", ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  }).stdout.trim();
  console.log(`  install scripts: SKIPPED (npm ${version} has no \`install-scripts\`; CI checks)`);
  process.exit(0);
}

const pending = report.allowScripts ?? [];
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
