// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Hybrid, not static and not server. `output: "static"` with an adapter
// present means every page prerenders to HTML at build time unless it
// opts out with `export const prerender = false`. Only the three
// endpoints under src/pages/api/ opt out, so the marketing surface is
// files on disk and the Node process exists solely to accept two form
// POSTs and answer a health check.
//
// That split is the whole point of the shape — but it is a property of
// how the site is SERVED, not of this file. It only holds if the web
// server serves dist/client from disk and proxies just the dynamic
// routes. Point a proxy at Node for everything and you get the old
// shape back with extra steps: Node serving static bytes it has no
// reason to touch, and one crashed process taking all 13 static pages
// down with it. See "Serving contract" in CLAUDE.md.
export default defineConfig({
  site: "https://tylervigario.com",
  output: "static",
  adapter: node({ mode: "standalone" }),
  trailingSlash: "never",
  // No UI framework integration, deliberately, and no carousel library
  // either. Nothing on this site needs one: the animations are
  // IntersectionObserver, the menu is <details>, the lightbox is
  // <dialog> plus CSS scroll-snap, and the forms post HTML. Adding a
  // framework here would put a runtime in the browser that no page has
  // a use for — and the CI gate asserts the homepage ships zero
  // external bundles, so doing it would fail the build rather than
  // quietly regress. If something ever genuinely needs one, that is the
  // moment to argue for it — not before.
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // better-sqlite3 is a native addon and cannot be bundled. Astro's
    // SSR build must resolve it from node_modules at runtime, the same
    // reason it was listed in Next's serverExternalPackages.
    ssr: { external: ["better-sqlite3"] },
  },
});
