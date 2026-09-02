import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * The rule that outranks the others: nothing ever erases what someone
 * typed. Not on a validation failure, not on a server error, not on a
 * reload.
 *
 * That has been true because of the *absence* of a code path, which is
 * a property nothing was checking. It was asserted in CLAUDE.md and
 * enforced by whoever remembered it. This is the check.
 *
 * A form that loses a submission loses a lead, and nothing upstream
 * recovers it — so this is deliberately structural rather than a
 * behavioural test of one component. A behavioural test proves the
 * paths it exercises; this proves no other path exists.
 */

const SRC = "src";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|astro)$/.test(e.name) ? [full] : [];
  });
}

/** Assignment to `.value`, excluding `==`, `===` and `!=` comparisons. */
const ASSIGN = /\.value\s*=(?!=)/g;
/** Wholesale clears: form.reset() drops every field at once. */
const RESET = /\.reset\s*\(\s*\)/g;
/** Replacing a subtree the user may be typing into. */
const INNER_HTML = /\.innerHTML\s*=(?!=)/g;

const hits = (re: RegExp) =>
  sourceFiles(SRC).flatMap((f) => {
    const lines = readFileSync(f, "utf8").split("\n");
    return lines
      .map((line, i) => ({ file: f, line: i + 1, text: line.trim() }))
      .filter((l) => new RegExp(re.source).test(l.text));
  });

describe("nothing erases what someone typed", () => {
  it("has exactly one assignment to input.value in the whole tree", () => {
    const found = hits(ASSIGN);
    expect(
      found.map((f) => `${f.file}:${f.line}  ${f.text}`),
      "A second assignment to .value is how input starts getting lost. If this " +
        "is a deliberate new one, it needs a guard proving the field is empty.",
    ).toHaveLength(1);
  });

  it("puts that assignment in the draft restore, guarded on an empty field", () => {
    const [only] = hits(ASSIGN);
    expect(only.file).toBe(path.join("src", "lib", "forms", "enhance.ts"));

    // The guard must be within a few lines above it — restoring into a
    // field someone is already typing in is the failure this prevents.
    const lines = readFileSync(only.file, "utf8").split("\n");
    const window = lines.slice(Math.max(0, only.line - 8), only.line).join("\n");
    expect(window, "the assignment is not guarded on an empty field").toMatch(/\.value\s*===\s*""/);
  });

  it("never calls form.reset()", () => {
    expect(hits(RESET).map((f) => `${f.file}:${f.line}`)).toHaveLength(0);
  });

  // innerHTML is only dangerous on a subtree that might hold live input.
  // Writing to an element created moments earlier cannot destroy
  // anything, so the rule is about the target rather than the API.
  it("only assigns innerHTML to elements it just created", () => {
    const offenders = hits(INNER_HTML).filter(({ file, line, text }) => {
      const target = /(\w+)\.innerHTML/.exec(text)?.[1];
      if (!target) return true;
      const lines = readFileSync(file, "utf8").split("\n");
      const before = lines.slice(Math.max(0, line - 12), line).join("\n");
      return !new RegExp(`${target}\\s*=\\s*document\\.createElement`).test(before);
    });
    expect(
      offenders.map((f) => `${f.file}:${f.line}  ${f.text}`),
      "innerHTML on an element that was queried rather than created can " +
        "replace a subtree someone is typing into.",
    ).toHaveLength(0);
  });
});
