import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HONEYPOT_FIELD, isTrapped } from "@/lib/api/honeypot";

/**
 * The trap has to be present in the markup AND checked on the server.
 * Either half alone is nothing: a field nobody reads catches no spam,
 * and a check for a field that is not rendered can never fire.
 */
describe("the honeypot", () => {
  it("catches a filled field", () => {
    expect(isTrapped({ [HONEYPOT_FIELD]: "http://spam.example" })).toBe(true);
  });

  it("ignores whitespace, which a real browser can submit", () => {
    expect(isTrapped({ [HONEYPOT_FIELD]: "   " })).toBe(false);
  });

  it("lets an ordinary submission through", () => {
    expect(isTrapped({ name: "Ada", contact: "ada@example.com" })).toBe(false);
    expect(isTrapped({ [HONEYPOT_FIELD]: "" })).toBe(false);
    expect(isTrapped(null)).toBe(false);
    expect(isTrapped("not an object")).toBe(false);
  });

  it("is rendered by both forms, under the name the server checks", () => {
    for (const f of ["src/components/QuoteForm.astro", "src/components/PotsAuditForm.astro"]) {
      const markup = readFileSync(f, "utf8");
      expect(markup).toContain(`name="${HONEYPOT_FIELD}"`);
      // Hidden by class: an inline style would be blocked by the CSP.
      expect(markup).toContain("hp-field");
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('tabindex="-1"');
      expect(markup).not.toMatch(/name="website"[^>]*required/);
    }
  });

  it("is hidden off-canvas, not by display:none", () => {
    // A bot that honours display:none skips the field, and a skipped
    // trap catches nothing.
    const css = readFileSync("src/styles/global.css", "utf8");
    const rule = css.slice(css.indexOf(".hp-field"));
    expect(rule).toContain("position: absolute");
    expect(rule.slice(0, rule.indexOf("}"))).not.toContain("display: none");
  });

  // That it is checked BEFORE validation, and stores nothing, is proved
  // behaviourally in submit.test.ts rather than by reading source order.
});
