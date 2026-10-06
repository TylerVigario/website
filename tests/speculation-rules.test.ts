import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { EXCLUDED_PREFIXES, GET, rules } from "../src/pages/speculation-rules.json";

/**
 * Speculation rules prerender a page while the pointer rests on its link.
 * A page Node renders per request must never be one of them: a hover would
 * cost the process a render, and nothing reads the result unless the
 * visitor clicks. This finds every page that opts out of prerendering and
 * requires the rules to exclude it, so adding one cannot quietly make it
 * a hover target.
 */
const PAGES = "src/pages";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : [full];
  });
}

/** The URL path a page file serves, as the prefix a link to it starts with. */
function routeOf(file: string): string {
  const rel = path.relative(PAGES, file).split(path.sep).join("/");
  const route = "/" + rel.replace(/\.(astro|ts)$/, "").replace(/(^|\/)index$/, "");
  return route.startsWith("/api/") ? "/api/" : route;
}

const dynamic = [
  ...new Set(
    files(PAGES)
      .filter((f) => /export const prerender = false/.test(readFileSync(f, "utf8")))
      .map(routeOf),
  ),
].sort();

describe("speculation rules", () => {
  it("find the pages that render per request", () => {
    expect(dynamic).toEqual(["/api/", "/contact", "/pots-migration"]);
  });

  it.each(dynamic)("never prerender %s", (route) => {
    expect(EXCLUDED_PREFIXES).toContain(route);
    expect(JSON.stringify(rules)).toContain(`[href^='${route}']`);
  });

  it("prerender on intent, not eagerly", () => {
    expect(rules.prerender.map((r) => r.eagerness)).toEqual(["moderate"]);
  });

  it("are served as speculation rules, which a header-loaded set must be", async () => {
    const res = await (GET as () => Response | Promise<Response>)();
    expect(res.headers.get("content-type")).toBe("application/speculationrules+json");
    expect(JSON.parse(await res.text())).toEqual(rules);
  });
});
