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
      // PNG at the two sizes install prompts actually look for. The single
      // SVG this replaced satisfied Chrome and nothing else, and the file
      // it pointed at was a generic mark rather than the VTS logo.
      // `maskable` is safe because these carry an opaque background, so a
      // platform cropping to a circle cannot cut into transparency.
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
