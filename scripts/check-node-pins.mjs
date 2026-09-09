/**
 * Asserts the two Node version pins agree.
 *
 * `.nvmrc` is what CI installs (the setup composite reads it via
 * `node-version-file`), and `package.json#engines.node` is what npm
 * enforces at install time. There is no third pin, and nothing derives
 * one from the other, so they drift silently: a bump to one leaves the
 * other claiming a major that is no longer used, and the failure shows
 * up as an install refusing or a CI job running a different runtime
 * than the developer did.
 *
 * This lived as inline bash in the gate, which meant the check existed
 * only after a push. It is a script so the pre-push hook and the gate
 * can run the identical comparison rather than two transcriptions of it.
 */
import fs from "node:fs";

const major = (s) => s?.match(/(\d+)/)?.[1];

const nvmrc = major(fs.readFileSync(".nvmrc", "utf8"));
const engines = major(JSON.parse(fs.readFileSync("package.json", "utf8")).engines?.node);

if (!nvmrc || !engines) {
  console.error(
    `error: could not read a major from .nvmrc (${nvmrc}) or engines.node (${engines})`,
  );
  process.exit(1);
}

if (nvmrc !== engines) {
  console.error(`error: Node major mismatch — .nvmrc=${nvmrc}, engines.node=${engines}.`);
  console.error("Bump both together.");
  process.exit(1);
}

console.log(`  node pins agree: ${nvmrc}`);
