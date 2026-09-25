import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The POTS landing page is one long page whose calls to action, and the
 * no-JS redirects back to it, all jump to the form. A fragment with no
 * matching id is a link that silently does nothing: the button scrolls
 * nowhere, and a visitor sent back with an error lands at the top of the
 * page with the error far below the fold.
 */
const read = (f: string) => readFileSync(f, "utf8");

// Everything the page renders that can carry an id the page links to.
const PAGE = ["src/components/POTSLanding.astro", "src/components/PotsAuditForm.astro"];

describe("every fragment the POTS page points at exists on it", () => {
  const links = [...read("src/components/POTSLanding.astro").matchAll(/href="#([\w-]+)"/g)];
  const redirects = [...read("src/pages/api/pots-audit.ts").matchAll(/redirect\([^)]*#([\w-]+)/g)];
  const targets = [...new Set([...links, ...redirects].map((m) => m[1]))];

  it("finds the references it is checking", () => {
    expect(targets).toContain("audit");
  });

  it.each(targets)("#%s", (id) => {
    expect(PAGE.some((f) => read(f).includes(`id="${id}"`))).toBe(true);
  });
});
