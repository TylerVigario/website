import { describe, expect, it } from "vitest";
import { potsAuditRules, quoteRules, type FieldValue } from "@/lib/forms/rules";
import { QuoteRequest } from "@/lib/api/quote";
import { BILL_RANGES, PotsAuditRequest } from "@/lib/api/pots-audit";
import { services as catalog } from "@/lib/services";
import { SITE } from "@/lib/site";

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

const OURS = new URL(SITE).hostname;

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
  // Both sides of every length limit in src/lib/forms/limits.ts. Each
  // field is tried against all of them, so a limit that differs between
  // the rule and the schema, or a message that does, fails here.
  ...[100, 150, 254, 20_000].flatMap((n) => ["x".repeat(n), "x".repeat(n + 1)]),
  // Measured after trimming, on both sides.
  "  " + "x".repeat(100) + "  ",
  // A tab is what a paste can put in a single-line input, which drops
  // line breaks itself. The server makes each run of them one space
  // before it measures (one-line.ts); the browser has to do the same, or
  // a long name with tabs in it is refused here and kept there.
  "\t\t",
  "x".repeat(50) + "\t".repeat(60) + "x".repeat(49),
  "x".repeat(50) + "\t".repeat(60) + "x".repeat(50),
  // An address at the site's own domain, which the contact field refuses
  // (our-domain.ts), and ones that only resemble it, which it takes.
  `les@${OURS}`,
  `Les@${OURS.toUpperCase()}`,
  `les@mail.${OURS}`,
  `email les@${OURS}.`,
  `les@${OURS}.example`,
  `les@not${OURS}`,
  `les@${OURS}x`,
  // Over the limit and ours: both sides name the limit first.
  "x".repeat(250) + `@${OURS}`,
];
/** Choice fields can only send what they offer — the checkbox group its
 *  catalog titles, the select its ranges or its empty placeholder — so
 *  those are their samples. The schema rejects anything else, and the
 *  browser cannot produce anything else to be rejected. */
const [t0, t1] = catalog.map((s) => s.title);
if (!t0 || !t1) throw new Error("these samples need at least two services in the catalog");
const CHOICES: Record<string, { baseline: FieldValue; samples: FieldValue[] }> = {
  services: { baseline: [t0], samples: [[], [t0], [t0, t1]] },
  bill: { baseline: BILL_RANGES[0], samples: ["", ...BILL_RANGES] },
};

function schemaMessageFor(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } },
  base: Record<string, FieldValue>,
  field: string,
  value: unknown,
): string | null {
  const result = schema.safeParse({ ...base, [field]: value });
  if (result.success) return null;
  const issues = (result.error?.issues ?? []) as { path: PropertyKey[]; message: string }[];
  const hit = issues.find((i) => i.path[0] === field);
  return hit ? hit.message : null;
}

/** A valid submission, so that changing one field is the only thing
 *  under test — otherwise every case fails on unrelated missing fields. */
function baseline(fields: string[]): Record<string, FieldValue> {
  const valid: Record<string, FieldValue> = {};
  for (const f of fields) valid[f] = CHOICES[f]?.baseline ?? "x";
  return valid;
}

describe.each(RULE_SCHEMA_PAIRS)("$name rules match the schema", ({ rules, schema }) => {
  const fields = Object.keys(rules);
  const valid = baseline(fields);

  it("the baseline is actually valid, or every case below is meaningless", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("covers exactly the schema's fields, no more and no fewer", () => {
    const schemaFields = Object.keys((schema as unknown as { def: { shape: object } }).def.shape);
    expect([...fields].sort()).toEqual([...schemaFields].sort());
  });

  for (const [field, rule] of Object.entries(rules)) {
    const samples = CHOICES[field]?.samples ?? SAMPLES;
    // Wrapped: it.each spreads an array case into separate arguments,
    // so ["Networking"] would arrive as the string "Networking".
    it.each(samples.map((s) => [s]))(`${field} agrees on %j`, (value) => {
      const mine = rule(value);
      const theirs = schemaMessageFor(schema, valid, field, value);
      // Same verdict...
      expect(mine === null).toBe(theirs === null);
      // ...and the same words, so the message does not change depending
      // on whether the client or the server caught it.
      if (mine !== null) expect(mine).toBe(theirs);
    });
  }
});

/**
 * What only a script sends: a field left out, or a value no form control
 * produces. No rule in the browser ever sees one, so there is nothing to
 * agree with. What holds instead is that the schema answers in its own
 * words. A message zod supplies comes from whichever locale the server's
 * bundle happens to load, which depends on what else is bundled: English
 * while Astro's own code brings in the rest of zod, "Invalid input" when
 * it does not. A required field answers as the browser does when empty.
 */
const NOT_FROM_A_FORM: unknown[] = [undefined, null, 0, true, {}];
const NOT_TEXT = "Please write the details as text.";
const NOT_AN_OBJECT = "That submission could not be read. Please send it again.";

describe.each(RULE_SCHEMA_PAIRS)("$name schema answers what no form sends", ({ rules, schema }) => {
  const valid = baseline(Object.keys(rules));

  for (const [field, rule] of Object.entries(rules)) {
    const empty: FieldValue = Array.isArray(CHOICES[field]?.baseline) ? [] : "";
    // Also a list where one value belongs, and one value where a list does.
    const values = [...NOT_FROM_A_FORM, Array.isArray(empty) ? "x" : ["x"]];
    it.each(values.map((v) => [v]))(`${field} answers %j in its own words`, (value) => {
      // A field that may be empty may be left out, and takes nothing else.
      const expected = rule(empty) ?? (value === undefined ? null : NOT_TEXT);
      expect(schemaMessageFor(schema, valid, field, value)).toBe(expected);
    });
  }

  it.each([[null], [[]], ["x"], [0]])("a body of %j is answered in its own words", (body) => {
    const result = schema.safeParse(body);
    expect(result.error?.issues.map((i) => i.message)).toEqual([NOT_AN_OBJECT]);
  });
});
