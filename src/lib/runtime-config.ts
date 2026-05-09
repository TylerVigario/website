/**
 * Runtime config validation.
 *
 * Called once at server startup via `src/instrumentation.ts`. Throws
 * if any required env var is missing or malformed — failing the
 * server before it serves a single request.
 *
 * Why not validate at module load? `next build` loads every API
 * route module to collect page data; an import-time throw would
 * force CI to provide runtime values that have no build-time use.
 * Instrumentation runs at server startup but NOT during build, so
 * the build is config-free and runtime stays fail-fast.
 *
 * Single source for the required-var names: `./required-env.json`.
 * The release workflow's `MANIFEST.requiredEnv` reads from the same
 * file (jq slurpfile), so the contract emitted to prod stays aligned
 * with what this module enforces. Adding a required var = add to
 * the JSON, add a format validator below.
 */

import path from "node:path";
import REQUIRED_ENV from "./required-env.json";

const FORMAT_CHECKS: Record<string, (v: string) => void> = {
  SQLITE_PATH: validateSqlitePath,
};

export function validateRuntimeConfig(): void {
  const errors: string[] = [];
  for (const name of REQUIRED_ENV) {
    const v = process.env[name];
    if (!v) {
      errors.push(`${name} is not set.`);
      continue;
    }
    const check = FORMAT_CHECKS[name];
    if (check) {
      try {
        check(v);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }
  if (errors.length > 0) {
    // Surface every misconfigured var at once instead of one-at-a-time
    // — saves the "fix one, restart, fix the next, restart" loop on a
    // fresh deploy.
    throw new Error(
      `Runtime config validation failed:\n  - ${errors.join("\n  - ")}\nSee .env.example.`,
    );
  }
}

function validateSqlitePath(v: string): void {
  if (!path.isAbsolute(v)) {
    throw new Error(
      `SQLITE_PATH must be an absolute path (got "${v}"). Relative paths depend on the process cwd and break under systemd.`,
    );
  }
}
