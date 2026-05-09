/**
 * Build the standalone Next.js server entrypoint.
 *
 * Outputs:
 *   bin/server.mjs           — single-file ESM bundle of server.ts.
 *                              Copied to .next/standalone/server.mjs by
 *                              scripts/postbuild.ts (the tarball-root
 *                              path that MANIFEST.startCommand points at).
 *   bin/server.trace.json    — JSON array of node_modules paths the
 *                              bundle needs at runtime, derived by
 *                              walking server.mjs's import graph with
 *                              @vercel/nft. Read by next.config.ts and
 *                              fed into outputFileTracingIncludes so
 *                              the standalone tar carries the runtime
 *                              deps (most importantly @sentry/nextjs's
 *                              package.json — without it ESM resolution
 *                              from server.mjs fails at prod startup).
 *
 * Why bundle the entry instead of writing server.mjs by hand: a hand-
 * written .mjs postbuild-copied alongside the standalone is invisible
 * to Next's tracer — its imports never get walked, the standalone tar
 * lands without their package.json files, prod dies with
 * ERR_MODULE_NOT_FOUND on swap. Bundling + nft-tracing puts the entry
 * in charge of declaring its own runtime contract instead of hoping
 * Next's tracer happens to cover it. v1.2.0 hit this exact failure
 * with @sentry/nextjs (see docs/deployment.md "Standalone import
 * resolution"). Same pattern vis-daily-tracker uses.
 *
 * Native + Next + @sentry/* stay external — the standalone tar
 * already ships them via outputFileTracingIncludes, no reason to
 * inline them and double the binary size.
 */
import { build } from "esbuild";
import { nodeFileTrace } from "@vercel/nft";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const outdir = "bin";
const outfile = `${outdir}/server.mjs`;
const tracefile = `${outdir}/server.trace.json`;

await mkdir(outdir, { recursive: true });

// Inline SENTRY_RELEASE at build time so events from the server
// runtime carry the right release tag even if prod's env file
// doesn't define SENTRY_RELEASE. Same value next.config.ts uses for
// withSentryConfig + the Next env block — keeps source-map upload
// keyed on the same string the runtime tags events with.
const { version } = JSON.parse(await readFile("./package.json", "utf-8")) as { version: string };
const sentryRelease = `vigario-technology-solutions@${version}`;

await build({
  entryPoints: ["server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  outfile,
  external: ["next", "next/*", "@sentry/*", "better-sqlite3"],
  define: {
    "process.env.SENTRY_RELEASE": JSON.stringify(sentryRelease),
  },
  banner: {
    js: [
      `import { createRequire } from "module";`,
      `const require = createRequire(import.meta.url);`,
    ].join("\n"),
  },
  logLevel: "info",
});

// Trace the bundle's runtime deps and emit the manifest. NFT walks
// the bundle's import graph (resolving externals against
// node_modules) and returns every file the runtime will touch. We
// keep only the node_modules subtree — Next's outputFileTracingIncludes
// copies those into .next/standalone/node_modules/ at build time.
const { fileList, warnings } = await nodeFileTrace([outfile]);
// Normalize separators so a local Windows build produces the same
// manifest a Linux CI build would. The standalone tar is consumed
// on Linux either way; outputFileTracingIncludes globs match against
// posix-style paths.
const manifest = [...fileList]
  .map((p) => p.replace(/\\/g, "/"))
  .filter((p) => p.startsWith("node_modules/"))
  .sort();

if (warnings.size > 0) {
  // NFT warns on dynamic requires it can't resolve statically.
  // Usually safe (optional deps, conditional fallbacks) but worth
  // surfacing so a real missing-import doesn't get silently skipped.
  console.warn(`[build-server] nft warnings (${warnings.size}):`);
  for (const w of warnings) console.warn(`  ${w.message}`);
}

await writeFile(tracefile, JSON.stringify(manifest, null, 2) + "\n");
console.log(`  ${tracefile} (${manifest.length} runtime deps)`);

// Smoke test: --check exits 0 right after module-level imports
// finish, before any side-effecting bootstrap (chdir, signal
// handlers, app.prepare, listen). Catches ERR_MODULE_NOT_FOUND
// against THIS repo's node_modules — postbuild.ts runs the same
// check against the standalone tree, which is the one prod
// actually executes.
const probe = spawnSync(process.execPath, [outfile, "--check"], {
  stdio: "inherit",
  // Strip env vars that would trigger live behavior. The check
  // exits before any of these are touched; clearing is belt-and-
  // suspenders against a module that validates env at import time.
  env: { ...process.env, SQLITE_PATH: "", SENTRY_DSN: "" },
});
if (probe.status !== 0) {
  console.error(`[build-server] smoke test failed (exit ${probe.status})`);
  process.exit(1);
}
