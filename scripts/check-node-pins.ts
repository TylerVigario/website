/**
 * Asserts the two Node pins name the same Node, and that `.nvmrc` names
 * one exactly.
 *
 * `.nvmrc` is the exact version CI installs (setup-node reads it through
 * `node-version-file`), and `package.json#engines.node` is the major npm
 * checks at install time, and warns on (engine-strict is not set).
 * Nothing derives one from the other, so they drift silently: a bump to
 * one leaves the other claiming a major that is no longer used, and the
 * failure shows up as an install warning nobody reads or a CI job running
 * a different runtime than the developer did.
 *
 * Exact, because setup-node takes the first match it finds in the
 * runner's tool cache: given "24", a job runs whichever 24.x the runner
 * image carries that week, so the Node a release was built on would
 * change with no commit changing. Named exactly, the version is fixed by
 * the commit, and the release's RELEASE file records the one that ran.
 *
 * This lived as inline bash in the gate, which meant the check existed
 * only after a push. It is a script so the pre-push hook and the gate
 * run the identical comparison.
 */
import fs from "node:fs";

const fail = (message: string): never => {
  console.error(`error: ${message}`);
  process.exit(1);
};

const nvmrc = fs.readFileSync(".nvmrc", "utf8").trim();
if (!/^\d+\.\d+\.\d+$/.test(nvmrc)) {
  fail(`.nvmrc names "${nvmrc}", not an exact version, so CI would run whatever matches it`);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { engines?: { node?: string } };
const engines = pkg.engines?.node?.match(/(\d+)/)?.[1];
const major = nvmrc.split(".")[0];
if (engines !== major) {
  fail(
    `Node major mismatch: .nvmrc=${nvmrc}, engines.node=${pkg.engines?.node}. Bump both together.`,
  );
}

console.log(`  node pins agree: ${nvmrc}`);
