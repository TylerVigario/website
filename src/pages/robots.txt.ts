import type { APIRoute } from "astro";

// A route rather than a static file so the sitemap URL follows
// astro.config's `site`. Hardcoding the domain here is exactly what
// makes a domain move a grep instead of a config change.
export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "",
      `Sitemap: ${new URL("sitemap-index.xml", site).href}`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
