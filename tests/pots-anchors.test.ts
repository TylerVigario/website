import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The POTS landing page is one long page whose calls to action, the
 * form's no-JS post and the redirects back to it all jump to the form. A
 * fragment with no matching id is a link that silently does nothing: the
 * button scrolls nowhere, and a visitor whose send failed lands at the top
 * of the page with the error far below the fold.
 */
const read = (f: string) => readFileSync(f, "utf8");

// Everything the page renders that can carry an id the page links to.
const PAGE = ["src/components/POTSLanding.astro", "src/components/PotsAuditForm.astro"];

// Every URL back to the page: the form's action, the page's redirect after
// a send, and the API's for a form post sent to it.
const RETURNS = [
  "src/components/PotsAuditForm.astro",
  "src/pages/pots-migration.astro",
  "src/pages/api/pots-audit.ts",
];
const fragments = (f: string) =>
  [...read(f).matchAll(/"\/pots-migration[^"#]*#([\w-]+)"/g)].map((m) => m[1]);

describe("every fragment the POTS page points at exists on it", () => {
  const links = [...read("src/components/POTSLanding.astro").matchAll(/href="#([\w-]+)"/g)];
  const targets = [...new Set([...links.map((m) => m[1]), ...RETURNS.flatMap(fragments)])];

  it("finds the links it is checking", () => {
    expect(targets).toContain("audit");
  });

  it.each(RETURNS)("finds the URL back to the page in %s", (f) => {
    expect(fragments(f)).not.toEqual([]);
  });

  it.each(targets)("#%s", (id) => {
    expect(PAGE.some((f) => read(f).includes(`id="${id}"`))).toBe(true);
  });
});
