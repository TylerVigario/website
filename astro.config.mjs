// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { RUNTIME_EXTERNALS } from "./runtime-externals.mjs";

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
  site: "https://vigario.tech",
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
    plugins: [
      tailwindcss(),
      // noExternal bundles every dependency into the server output, so
      // the deployed artifact needs no node_modules beyond the native
      // addon that cannot be bundled. See runtime-externals.mjs — that
      // list is shared with the release script so the two cannot drift.
      //
      // IT MUST NOT APPLY IN DEV. Set unconditionally it also routes
      // every dependency through Vite's SSR module runner, which
      // executes modules as ESM — and picomatch, reached via
      // @astrojs/node, is CommonJS. `astro dev` died on `require is not
      // defined` from the moment this was introduced, while `astro
      // build` stayed green because rolldown does the CJS interop the
      // dev runner does not. The gate never ran `astro dev`, so nothing
      // caught it.
      //
      // A plugin `config` hook is how Vite exposes the command, which
      // Astro's plain `vite` object cannot express.
      {
        name: "vigario:bundle-ssr-deps-on-build",
        config(_config, { command }) {
          if (command !== "build") return;
          return { ssr: { noExternal: true } };
        },
      },
    ],
    ssr: { external: RUNTIME_EXTERNALS },
  },
});
