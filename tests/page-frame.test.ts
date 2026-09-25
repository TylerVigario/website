import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Base.astro owns the page frame: header, <main id="main">, footer. When
 * every page repeated the frame by hand, eleven of fifteen left out
 * <main>, so the skip link pointed at nothing and screen readers found
 * no main landmark, and the POTS page ended up with two headers and two
 * footers. These checks keep the frame in one place.
 */
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : full.endsWith(".astro") ? [full] : [];
  });

const BASE = path.join("src", "layouts", "Base.astro");
const base = readFileSync(BASE, "utf8");
const pages = files(path.join("src", "pages"));
const rest = [...pages, ...files(path.join("src", "components"))];

describe("the page frame lives in Base.astro", () => {
  it("renders exactly one main landmark, with the id the skip link targets", () => {
    expect(base.match(/<main\b[^>]*\bid="main"/g)).toHaveLength(1);
    expect(base).toContain('href="#main"');
  });

  it("is the only place a <main> element is written", () => {
    expect(rest.filter((f) => /<main\b/.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("is the only place the site header and footer are rendered", () => {
    expect(rest.filter((f) => /<(Nav|Footer)\b/.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("wraps every page", () => {
    expect(pages.length).toBeGreaterThan(10);
    expect(pages.filter((f) => !readFileSync(f, "utf8").includes("<Base"))).toEqual([]);
  });
});
