/**
 * Asserts the three Node pins name the same Node.
 *
 * `.nvmrc` is the exact version CI installs (the node action reads it),
 * `package.json#engines.node` is the major npm checks at install time,
 * and warns on (engine-strict is not set), and
 * `.github/actions/node/node-linux-x64.sha256` is the digest of the one
 * archive CI accepts for that version. Nothing derives one from another,
 * so they drift silently: a bump to `.nvmrc` alone leaves engines
 * claiming a major that is no longer used, or leaves CI refusing every
 * job for want of a digest.
 *
 * This lived as inline bash in the gate, which meant the check existed
 * only after a push. It is a script so the pre-push hook and the gate
 * can run the identical comparison rather than two transcriptions of it.
 */
import fs from "node:fs";

const DIGEST_FILE = ".github/actions/node/node-linux-x64.sha256";

const fail = (message: string): never => {
  console.error(`error: ${message}`);
  process.exit(1);
};

const nvmrc = fs.readFileSync(".nvmrc", "utf8").trim();
if (!/^\d+\.\d+\.\d+$/.test(nvmrc)) {
  fail(`.nvmrc names "${nvmrc}", not an exact version; the digest is for one archive`);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { engines?: { node?: string } };
const engines = pkg.engines?.node?.match(/(\d+)/)?.[1];
const major = nvmrc.split(".")[0];
if (engines !== major) {
  fail(
    `Node major mismatch: .nvmrc=${nvmrc}, engines.node=${pkg.engines?.node}. Bump both together.`,
  );
}

const digest = fs.readFileSync(DIGEST_FILE, "utf8");
const line = /^[0-9a-f]{64} {2}node-v(\d+\.\d+\.\d+)-linux-x64\.tar\.xz\n?$/.exec(digest);
if (!line) {
  fail(`${DIGEST_FILE} is not one line copied from Node's SHASUMS256.txt for linux-x64.tar.xz`);
}
if (line?.[1] !== nvmrc) {
  fail(`${DIGEST_FILE} is for Node ${line?.[1]}, but .nvmrc names ${nvmrc}. Bump them together.`);
}

console.log(`  node pins agree: ${nvmrc}`);
