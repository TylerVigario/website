import type { APIRoute } from "astro";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: "Vigario Technology Solutions",
      short_name: "VTS",
      description: "IT Services in Fresno, CA",
      start_url: "/",
      display: "standalone",
      background_color: "#fafaf9",
      theme_color: "#2970b5",
      icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
