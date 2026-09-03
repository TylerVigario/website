import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { POTS_AUDIT_MARKER } from "../src/lib/api/pots-audit";

/**
 * Both forms write to one `quotes` table, and `services` is the only
 * column telling the two kinds of row apart: a real services array for a
 * quote, this literal for an audit.
 *
 * Nothing fails if it changes. Every row written afterwards is simply
 * indistinguishable from a quote, retroactively unrecoverable, with no
 * error anywhere to notice it by.
 */
describe("the audit row marker", () => {
  it("is the exact string the data already on disk was written with", () => {
    expect(POTS_AUDIT_MARKER).toBe("POTS Migration Audit");
  });

  it("is the value the audit route actually inserts", () => {
    const route = readFileSync("src/pages/api/pots-audit.ts", "utf8");
    expect(route).toContain("POTS_AUDIT_MARKER");
    expect(
      route,
      "the route inlines the marker instead of importing the constant, so the " +
        "two can drift apart",
    ).not.toMatch(/"POTS Migration Audit"/);
  });

  it("is not written by the quote route, which stores real services", () => {
    const quote = readFileSync("src/pages/api/quote.ts", "utf8");
    expect(quote).not.toContain("POTS Migration Audit");
    expect(quote).not.toContain("POTS_AUDIT_MARKER");
  });
});
