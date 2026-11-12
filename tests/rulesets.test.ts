import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A bypass reaches every rule in its ruleset, so where the release App is
 * exempt decides what it is exempt from. main.json holds what a release
 * commit cannot pass, and main-history.json what a release never needs to:
 * the App adds a commit to main and cannot delete, rewrite or merge into it.
 * version-tags.json lets the App create version tags and must hold nothing
 * else, or the App is past that too; tags.json, which makes every tag
 * create-once, must let nobody past.
 * And the patterns must reach what they mean to, where a ruleset's `*`
 * stops at `/`: every tag, for tags.json, and for version-tags.json what
 * `decide` reads, `git tag --list 'v*'`, which matches across it. Each is
 * one edit to a JSON file away, and GitHub applies whatever it is given.
 */

interface Actor {
  actor_id: number;
  actor_type: string;
  bypass_mode: string;
}
interface Ruleset {
  name: string;
  target: string;
  enforcement: string;
  bypass_actors: Actor[];
  conditions: { ref_name: { include: string[]; exclude: string[] } };
  rules: { type: string; parameters?: unknown }[];
}

const read = (file: string) =>
  JSON.parse(readFileSync(`.github/rulesets/${file}`, "utf8")) as Ruleset;
const main = read("main.json");
const history = read("main-history.json");
const tags = read("tags.json");
const versions = read("version-tags.json");
const types = (ruleset: Ruleset) => ruleset.rules.map((r) => r.type).sort();

describe("main.json", () => {
  it("holds what a release commit cannot pass, and nothing else", () => {
    // No pull request, and no checks or analysis ever run on it.
    expect(types(main)).toEqual(["code_scanning", "pull_request", "required_status_checks"]);
  });

  it("holds a merge on a CodeQL security alert of medium or above", () => {
    // CodeQL rates a script injection in a workflow medium when a pull request or a
    // push runs it. At high_or_higher, four of them passed this rule.
    expect(main.rules.find((r) => r.type === "code_scanning")?.parameters).toEqual({
      code_scanning_tools: [
        {
          tool: "CodeQL",
          security_alerts_threshold: "medium_or_higher",
          alerts_threshold: "errors",
        },
      ],
    });
  });
});

describe("main-history.json", () => {
  it("keeps main from being deleted, rewritten or merged into", () => {
    expect(types(history)).toEqual(["deletion", "non_fast_forward", "required_linear_history"]);
  });

  it("lets nobody past, the release App included", () => {
    expect(history.bypass_actors).toEqual([]);
  });

  it("is enforced, on the branch main.json protects", () => {
    expect(history.conditions).toEqual(main.conditions);
    expect(history).toMatchObject({ target: "branch", enforcement: "active" });
  });
});

describe("version-tags.json", () => {
  it("holds creation and nothing else", () => {
    expect(versions.rules.map((r) => r.type)).toEqual(["creation"]);
  });

  it("lets only the release App past, the one main.json names", () => {
    expect(main.bypass_actors).toHaveLength(1);
    expect(versions.bypass_actors).toEqual(main.bypass_actors);
  });

  it("covers a slashed version tag as well as a plain one", () => {
    expect(versions.conditions.ref_name.include.sort()).toEqual([
      "refs/tags/v*",
      "refs/tags/v*/**/*",
    ]);
    expect(versions.conditions.ref_name.exclude).toEqual([]);
  });

  it("is enforced, on tags", () => {
    expect(versions).toMatchObject({ target: "tag", enforcement: "active" });
  });
});

describe("tags.json", () => {
  it("lets nobody past, the release App included", () => {
    expect(tags.bypass_actors).toEqual([]);
  });

  it("covers every tag, a slashed one included", () => {
    expect(tags.conditions.ref_name.include).toEqual(["refs/tags/**/*"]);
    expect(tags.conditions.ref_name.exclude).toEqual([]);
  });

  it("does not decide who creates a tag", () => {
    // That would need a bypass here, and a bypass here is past update too.
    expect(tags.rules.map((r) => r.type)).not.toContain("creation");
  });
});
