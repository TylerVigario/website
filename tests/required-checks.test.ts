import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The ruleset requires checks by name, and nothing on GitHub compares that
 * list with the jobs that exist. A required name no job carries holds every
 * pull request on a result that never comes. A job the ruleset does not
 * name runs, and its failure blocks nothing: a check that is reported and
 * consumed by no one. Each is one rename or one new job away, so the two
 * lists are compared here, where the mistake is made.
 */

/** The `name:` of every job in a workflow, in order. */
function jobNames(file: string): string[] {
  const [, jobs = ""] = readFileSync(file, "utf8").split("\njobs:\n");
  return [...jobs.matchAll(/^ {4}name: (.+)$/gm)].map((m) => m[1] ?? "");
}

interface Check {
  context: string;
  integration_id?: number;
}
interface Rule {
  type: string;
  parameters?: { required_status_checks?: Check[] };
}

const ruleset = JSON.parse(readFileSync(".github/rulesets/main.json", "utf8")) as {
  rules: Rule[];
};
const required = ruleset.rules.flatMap((r) => r.parameters?.required_status_checks ?? []);
const GITHUB_ACTIONS = 15368;

describe("the checks main.json requires", () => {
  it("are every job in ci.yml and the title check, and nothing else", () => {
    expect(required.map((c) => c.context).sort()).toEqual(
      [...jobNames(".github/workflows/ci.yml"), "Validate PR title"].sort(),
    );
  });

  it("leave out Lint main, which never runs on a pull request", () => {
    expect(jobNames(".github/workflows/commit-convention.yml")).toContain("Lint main");
    expect(required.map((c) => c.context)).not.toContain("Lint main");
  });

  it("are each answered by GitHub Actions alone", () => {
    // Without the app, anything able to post a status of that name passes it.
    for (const check of required) expect(check.integration_id).toBe(GITHUB_ACTIONS);
  });

  it("name each job once", () => {
    const names = jobNames(".github/workflows/ci.yml");
    expect(new Set(names).size).toBe(names.length);
  });
});
