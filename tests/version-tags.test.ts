import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A bypass reaches every rule in its ruleset, so where the release App is
 * exempt decides what it is exempt from. version-tags.json lets the App
 * create version tags and must hold nothing else, or the App is past that
 * too; tags.json, which makes every tag create-once, must let nobody past.
 * And the patterns must cover what `decide` reads, `git tag --list 'v*'`,
 * which matches across `/` where a ruleset's `*` does not. Each of these is
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
  rules: { type: string }[];
}

const read = (file: string) =>
  JSON.parse(readFileSync(`.github/rulesets/${file}`, "utf8")) as Ruleset;
const main = read("main.json");
const tags = read("tags.json");
const versions = read("version-tags.json");

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

  it("does not decide who creates a tag", () => {
    // That would need a bypass here, and a bypass here is past update too.
    expect(tags.rules.map((r) => r.type)).not.toContain("creation");
  });
});
