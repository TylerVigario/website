import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MIN_FILL_MS, SERVED_FIELD, servedStamp, tooSoon } from "@/lib/api/fill-time";

/**
 * Like the honeypot, the floor has to be rendered by the forms AND read
 * on the server, or it is nothing. What a refusal does to a submission is
 * proved in submit.test.ts, and against the built server by check-forms.
 */
const now = 1_800_000_000_000;
const sent = (ago: number) => ({ [SERVED_FIELD]: String(now - ago) });

describe("the fill-time floor", () => {
  it("refuses a form sent sooner than the floor, and says how soon", () => {
    expect(tooSoon(sent(400), now)).toBe(400);
    expect(tooSoon(sent(MIN_FILL_MS - 1), now)).toBe(MIN_FILL_MS - 1);
  });

  it("lets one through from the floor on", () => {
    expect(tooSoon(sent(MIN_FILL_MS), now)).toBeNull();
    expect(tooSoon(sent(60 * 60 * 1000), now)).toBeNull();
  });

  it("refuses a stamp from the future, which this server did not write", () => {
    expect(tooSoon(sent(-5000), now)).not.toBeNull();
  });

  it("lets through a submission with no stamp, or one that does not read as one", () => {
    // A page served before the stamp existed has none.
    expect(tooSoon({ name: "Ada" }, now)).toBeNull();
    for (const bad of ["", "soon", "1.5e12", " 1800000000000", ["1800000000000"]]) {
      expect(tooSoon({ [SERVED_FIELD]: bad }, now)).toBeNull();
    }
    expect(tooSoon(null, now)).toBeNull();
    expect(tooSoon("not an object", now)).toBeNull();
  });
});

describe("the stamp a form renders", () => {
  it("is now, for a form served fresh", () => {
    expect(servedStamp({}, now)).toBe(String(now));
  });

  it("is the one it was sent with, when the form comes back after a failed send", () => {
    // Otherwise fixing one field and sending again would be too soon.
    expect(servedStamp(sent(1000), now)).toBe(String(now - 1000));
  });

  it("is now, when what came back is not a stamp this server wrote", () => {
    expect(servedStamp({ [SERVED_FIELD]: "soon" }, now)).toBe(String(now));
    expect(servedStamp(sent(-5000), now)).toBe(String(now));
  });

  it("is rendered by both forms, under the name the server reads", () => {
    for (const f of ["src/components/QuoteForm.astro", "src/components/PotsAuditForm.astro"]) {
      const markup = readFileSync(f, "utf8");
      expect(markup).toContain(
        `<input type="hidden" name="${SERVED_FIELD}" value={servedStamp(values)} />`,
      );
    }
  });
});
