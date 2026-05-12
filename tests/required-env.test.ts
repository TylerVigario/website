/**
 * required-env.json shape contract.
 *
 * The deploy contract (docs/deployment.md "Required env") names
 * src/lib/required-env.json as the single canonical source of
 * required environment variables. The same file is imported by
 * src/lib/runtime-config.ts for app-startup validation, so
 * deploy-time and runtime checks stay in lockstep automatically.
 *
 * This test asserts the file exists at the contract path and is
 * a non-empty array of strings. A renamed/moved/malformed file
 * would surface at app startup (runtime-config.ts imports it
 * directly and validates every name listed); catching it here in
 * CI converts "social protocol guarantees the file" into "test
 * enforces it".
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..");
const requiredEnv = JSON.parse(
  readFileSync(join(REPO_ROOT, "src/lib/required-env.json"), "utf8"),
) as unknown;

describe("src/lib/required-env.json", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(requiredEnv)).toBe(true);
    expect((requiredEnv as unknown[]).length).toBeGreaterThan(0);
    expect((requiredEnv as unknown[]).every((v) => typeof v === "string")).toBe(true);
  });
});
