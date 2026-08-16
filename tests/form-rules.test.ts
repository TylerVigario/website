import { describe, expect, it } from "vitest";
import { potsAuditRules, quoteRules, type FieldValue } from "@/lib/forms/rules";
import { QuoteRequest } from "@/lib/api/quote";
import { PotsAuditRequest } from "@/lib/api/pots-audit";

/** Paired HERE rather than in rules.ts: that module is imported by the
 *  browser, and importing a zod schema alongside the rules pulled zod
 *  core into the client bundle even though nothing referenced it. The
 *  separation is now structural instead of dependent on tree-shaking. */
const RULE_SCHEMA_PAIRS = [
  { name: "quote", rules: quoteRules, schema: QuoteRequest },
  { name: "pots-audit", rules: potsAuditRules, schema: PotsAuditRequest },
] as const;

/**
 * The client does not ship zod — it costs 34.5 KB gzipped, 45% of the
 * contact page, to enforce rules that amount to "this must not be
 * empty". The hand-written rules in src/lib/forms/rules.ts carry that
 * in ~1 KB instead.
 *
 * The price of hand-writing them is that they can drift from the
 * schema the server actually enforces, and drift would be silent: the
 * browser would accept something the server rejects, or show a message
 * that differs from the one the server returns. This test is what makes
 * that loud. It fails the build the moment the two disagree.
 *
 * Checked in BOTH directions, because only one of them is obvious:
 *   - every field the schema knows about has a rule, and vice versa
 *     (this direction caught a real mistake — potsAuditRules was
 *     missing `business` and `bill` entirely when first written)
 *   - for representative inputs, both produce the same verdict AND the
 *     same user-facing message
 */

/** Only what a DOM form can actually produce: strings and arrays of
 *  strings. Never undefined — a text input with nothing in it yields
 *  "", and an unticked checkbox group yields []. Testing `undefined`
 *  would compare against a case the browser cannot generate. */
const SAMPLES: FieldValue[] = [
  "",
  "   ",
  "a",
  "Tyler Vigario",
  "call the shop, 559 900 1400 ext 2",
];
const ARRAY_SAMPLES: FieldValue[] = [[], ["Networking"], ["Networking", "Linux"]];

function schemaMessageFor(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } },
  base: Record<string, FieldValue>,
  field: string,
  value: FieldValue,
): string | null {
  const result = schema.safeParse({ ...base, [field]: value });
  if (result.success) return null;
  const issues = (result.error?.issues ?? []) as { path: PropertyKey[]; message: string }[];
  const hit = issues.find((i) => i.path[0] === field);
  return hit ? hit.message : null;
}

describe.each(RULE_SCHEMA_PAIRS)("$name rules match the schema", ({ rules, schema }) => {
  const fields = Object.keys(rules);

  // A valid baseline so that changing one field is the only thing under
  // test — otherwise every case fails on unrelated missing fields.
  const valid: Record<string, FieldValue> = {};
  for (const f of fields) {
    valid[f] = rules[f]([]) === null && rules[f]("x") === null ? "x" : "x";
  }
  // Array fields are the ones whose rule rejects a plain string.
  for (const f of fields) {
    if (rules[f]("x") !== null) valid[f] = ["Networking"];
  }

  it("the baseline is actually valid, or every case below is meaningless", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("covers exactly the schema's fields, no more and no fewer", () => {
    const schemaFields = Object.keys((schema as unknown as { def: { shape: object } }).def.shape);
    expect([...fields].sort()).toEqual([...schemaFields].sort());
  });

  for (const field of fields) {
    const samples = Array.isArray(valid[field]) ? ARRAY_SAMPLES : SAMPLES;
    // Wrapped: it.each spreads an array case into separate arguments,
    // so ["Networking"] would arrive as the string "Networking".
    it.each(samples.map((s) => [s]))(`${field} agrees on %j`, (value) => {
      const mine = rules[field](value);
      const theirs = schemaMessageFor(schema, valid, field, value);
      // Same verdict...
      expect(mine === null).toBe(theirs === null);
      // ...and the same words, so the message does not change depending
      // on whether the client or the server caught it.
      if (mine !== null) expect(mine).toBe(theirs);
    });
  }
});
