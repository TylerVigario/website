/**
 * Assert key-set parity between the two env templates the project
 * maintains: `.env.example` (developer onboarding) and
 * `packaging/default.env` (RPM canonical defaults, installed at
 * /usr/lib/vigario-website/default.env). VALUES intentionally differ
 * between the two (dev wants localhost / an absolute SQLITE_PATH on
 * your machine, prod wants the StateDirectory path); KEYS must not
 * drift, or operators in one context will silently miss runtime knobs
 * that exist in the other.
 *
 * Build-time-only vars are documented exceptions: they appear in
 * `.env.example` (devs need them to build) but not in `default.env`
 * (the prod bundle is built once and they never influence runtime).
 * See EXAMPLE_ONLY below.
 *
 * Invocation:
 *   npm run check:env-templates       # local
 *   (runs in `prebuild` so every `npm run build` — including the CI
 *    gate's build step and the RPM %build — enforces it, and in the
 *    `npm run ci` umbrella for the local loop)
 *
 * Exits non-zero on drift with a punch list of missing keys per file
 * so the fix is one diff away.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_EXAMPLE = ".env.example";
const DEFAULT_ENV = "packaging/default.env";

/**
 * Vars that appear ONLY in .env.example. Each entry needs a reason.
 * These are consumed at build time (inlined into the Next bundle or
 * read by next.config.ts during `next build`) and never re-read at
 * runtime, so they don't belong in /etc/sysconfig/vigario-website.
 */
const EXAMPLE_ONLY: Record<string, string> = {
  NEXT_PUBLIC_SENTRY_DSN:
    "Build-time — Next inlines NEXT_PUBLIC_* into the client bundle at `next build`",
  SENTRY_ORG: "Build-time — consumed by withSentryConfig for source-map upload",
  SENTRY_PROJECT: "Build-time — consumed by withSentryConfig for source-map upload",
  SENTRY_AUTH_TOKEN: "Build-time — consumed by withSentryConfig for source-map upload",
};

/** Vars that appear ONLY in packaging/default.env. None today; if one
 *  appears later (e.g. a systemd-set value that never makes sense in
 *  dev), add it here with the reason. */
const DEFAULT_ONLY: Record<string, string> = {};

/** Extract every `KEY=` line (commented or not) from a template file.
 *  The leading `# ` form documents a known-optional var; the
 *  uncommented form is the same var set to its concrete default. Both
 *  forms count as "the runtime knows about this var" for parity. */
function extractKeys(filePath: string): Set<string> {
  const contents = readFileSync(resolve(filePath), "utf8");
  const keys = new Set<string>();
  for (const line of contents.split(/\r?\n/)) {
    const match = /^#?\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line);
    if (match) keys.add(match[1]);
  }
  return keys;
}

const exampleKeys = extractKeys(ENV_EXAMPLE);
const defaultKeys = extractKeys(DEFAULT_ENV);

const onlyInExample = [...exampleKeys].filter((k) => !defaultKeys.has(k));
const onlyInDefault = [...defaultKeys].filter((k) => !exampleKeys.has(k));

const unexpectedExampleOnly = onlyInExample.filter((k) => !(k in EXAMPLE_ONLY));
const unexpectedDefaultOnly = onlyInDefault.filter((k) => !(k in DEFAULT_ONLY));

const staleExampleExceptions = Object.keys(EXAMPLE_ONLY).filter((k) => !exampleKeys.has(k));
const staleDefaultExceptions = Object.keys(DEFAULT_ONLY).filter((k) => !defaultKeys.has(k));

const errors: string[] = [];

if (unexpectedExampleOnly.length > 0) {
  errors.push(
    `Keys in ${ENV_EXAMPLE} but NOT in ${DEFAULT_ENV}:\n  ${unexpectedExampleOnly.join("\n  ")}\n` +
      `Add to ${DEFAULT_ENV}, or — if build-time only — add to EXAMPLE_ONLY in scripts/check-env-templates.ts with a reason.`,
  );
}

if (unexpectedDefaultOnly.length > 0) {
  errors.push(
    `Keys in ${DEFAULT_ENV} but NOT in ${ENV_EXAMPLE}:\n  ${unexpectedDefaultOnly.join("\n  ")}\n` +
      `Add to ${ENV_EXAMPLE}, or — if RPM-runtime only — add to DEFAULT_ONLY in scripts/check-env-templates.ts with a reason.`,
  );
}

if (staleExampleExceptions.length > 0) {
  errors.push(
    `Stale EXAMPLE_ONLY exceptions (no longer in ${ENV_EXAMPLE}):\n  ${staleExampleExceptions.join("\n  ")}\n` +
      `Remove from EXAMPLE_ONLY in scripts/check-env-templates.ts.`,
  );
}

if (staleDefaultExceptions.length > 0) {
  errors.push(
    `Stale DEFAULT_ONLY exceptions (no longer in ${DEFAULT_ENV}):\n  ${staleDefaultExceptions.join("\n  ")}\n` +
      `Remove from DEFAULT_ONLY in scripts/check-env-templates.ts.`,
  );
}

if (errors.length > 0) {
  process.stderr.write(`✗ env template drift:\n\n${errors.join("\n\n")}\n`);
  process.exit(1);
}

const shared = [...exampleKeys].filter((k) => defaultKeys.has(k));
const exampleCount = Object.keys(EXAMPLE_ONLY).length;
const defaultCount = Object.keys(DEFAULT_ONLY).length;
process.stdout.write(
  `✓ env templates aligned — ${shared.length} shared keys` +
    `${exampleCount ? `, ${exampleCount} example-only` : ""}` +
    `${defaultCount ? `, ${defaultCount} default-only` : ""}\n`,
);
