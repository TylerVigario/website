import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The scroll reveal hides blocks until they are scrolled into view, and
 * nothing but scrolling undoes that. Print has no scrolling, so a hiding
 * rule that applies there drops every block below the fold from a printed
 * page or a saved PDF: /pots-migration printed 234 of its 1,025 words. The
 * rule that hides has to be scoped to the screen.
 */
describe("the scroll reveal hides content only on screen", () => {
  const css = readFileSync("src/styles/global.css", "utf8");

  it("puts every hiding rule inside a screen-only media query", () => {
    const blocks = [...css.matchAll(/@media([^{]*)\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)];
    const hiding = blocks.filter(([, , body]) =>
      /\[data-reveal-armed\][^{]*\{[^}]*opacity:\s*0/.test(body),
    );
    expect(hiding.length).toBeGreaterThan(0);
    for (const [, query] of hiding) expect(query).toMatch(/\bscreen\b/);
  });

  it("hides nothing outside a media query", () => {
    const outside = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    expect(outside).not.toMatch(/\[data-reveal-armed\][^{]*\{[^}]*opacity:\s*0/);
  });
});
