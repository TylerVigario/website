import type { APIRoute } from "astro";

/**
 * Speculation rules: Chrome and Edge render the next page in the
 * background while the pointer rests on its link, so following it is
 * instant. Other browsers ignore the rules and navigate as before.
 *
 * DELIVERED BY HEADER, NOT INLINE. An inline <script type="speculationrules">
 * is code as far as the CSP is concerned, and the policy has no
 * 'unsafe-inline'. So the server sends `Speculation-Rules:
 * "/speculation-rules.json"` with each page and serves this file as
 * application/speculationrules+json; CLAUDE.md's serving contract says
 * so. It is prerendered, so the Content-Type below is only what `astro
 * dev` sends.
 *
 * Moderate eagerness: a hover of about 200ms on desktop, a tap on touch.
 * Eager would render pages nobody asked for.
 *
 * EXCLUDED, each for a reason:
 *   - the pages Node renders per request, /contact and /pots-migration,
 *     and /api/: a hover must not cost the process a render. The test
 *     derives this list from the pages that opt out of prerendering, so a
 *     new one cannot be missed.
 *   - /_astro/: the screenshot grids link to the image files themselves,
 *     so a no-JS click still opens the picture. Prerendering one would
 *     download a 2400px image because a pointer passed over it.
 *   - downloads and rel=nofollow links, which are not pages to read next.
 */
export const EXCLUDED_PREFIXES = ["/contact", "/pots-migration", "/api/", "/_astro/"];

export const rules = {
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          {
            not: {
              selector_matches: [
                ...EXCLUDED_PREFIXES.map((p) => `[href^='${p}']`),
                "[download]",
                "[rel~='nofollow']",
              ].join(", "),
            },
          },
        ],
      },
      eagerness: "moderate",
    },
  ],
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify(rules), {
    headers: { "Content-Type": "application/speculationrules+json" },
  });
