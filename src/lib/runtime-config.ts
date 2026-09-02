/**
 * Runtime config validation.
 *
 * Called as `src/lib/db.ts` loads, which is the earliest point the app
 * can refuse to run with bad configuration. Throws if any required env
 * var is missing or malformed.
 *
 * It was previously called from Next's `src/instrumentation.ts`, and
 * that comment survived the file: the Astro migration deleted the hook
 * and nothing replaced the call, so the check sat here uninvoked while
 * the documentation still promised it.
 *
 * Module load was avoided under Next because `next build` executed
 * every API route module to collect page data, and an import-time throw
 * would have forced CI to supply runtime values with no build-time use.
 * `astro build` does not — the /api routes are `prerender = false` and
 * nothing runs them until a request arrives. Verified by building with
 * SQLITE_PATH unset.
 *
 * Single source for the required-var names: `./required-env.json`.
 * Adding a required var means adding it there and, if it has a shape
 * worth enforcing, a format validator below.
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
