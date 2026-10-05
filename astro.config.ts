import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { RUNTIME_EXTERNALS } from "./runtime-externals.ts";
import { BODY_LIMIT_BYTES } from "./src/lib/forms/limits.ts";

// Hybrid, not static and not server. `output: "static"` with an adapter
// present means every page prerenders to HTML at build time unless it
// opts out with `export const prerender = false`. Six routes opt out: the
// four under src/pages/api/ and the two pages that take input, /contact
// and /pots-migration. So the marketing surface is files on disk, and
// the Node process exists to take submissions, render those two pages
// and answer the health check.
//
// That split is the whole point of the shape — but it is a property of
// how the site is SERVED, not of this file. It only holds if the web
// server serves dist/client from disk and proxies just the dynamic
// routes. Point a proxy at Node for everything and you get the old
// shape back with extra steps: Node serving static bytes it has no
// reason to touch, and one crashed process taking all 13 static pages
// down with it. See "Serving contract" in CLAUDE.md.
const SITE = "https://vigario.tech";

export default defineConfig({
  site: SITE,
  // Trust the proxy's X-Forwarded-Proto and X-Forwarded-Host, but only for
  // this site's own https origin. Without this Astro never trusts them, so
  // behind a proxy that terminates TLS the request URL Node sees is
  // http://…, while a browser posting a form sends Origin: https://…, and
  // the origin check refuses every no-JavaScript submission with 403.
  // Measured: a form POST forwarded that way was refused before this was
  // set and accepted after. The only way round it without this is for the
  // proxy to rewrite Origin, which every host would have to know to do.
  //
  // Safe because the pattern is narrow: a forwarded host is used only if
  // it is this site's hostname, and anything else (a spoofed
  // X-Forwarded-Host) is ignored in favour of the real Host. A cross-site
  // POST is still refused. The serving contract in CLAUDE.md states what
  // the proxy must forward.
  security: {
    allowedDomains: [{ protocol: "https", hostname: new URL(SITE).hostname }],
  },
  output: "static",
  // bodySizeLimit: 256 KB rather than the adapter's default of 1 GiB,
  // which let one request store tens of megabytes. The longest valid
  // submission is 20,000 characters of details (src/lib/forms/limits.ts);
  // at worst three UTF-8 bytes a character, each percent-encoded, that is
  // about 180 KB, so no real submission comes near the cap. A body over it
  // cannot be read, and is answered 413 rather than as a validation failure.
  adapter: node({ mode: "standalone", bodySizeLimit: BODY_LIMIT_BYTES }),
  trailingSlash: "never",
  // No UI framework integration, deliberately, and no carousel library
  // either. Nothing on this site needs one: the animations are
  // IntersectionObserver, the menu is <details>, the lightbox is
  // <dialog> plus CSS scroll-snap, and the forms post HTML. Adding a
  // framework here would put a runtime in the browser that no page has
  // a use for — and check:bundles budgets every prerendered page's
  // JavaScript, the homepage at 1 KB, so doing it would fail the build
  // rather than quietly regress. If something ever genuinely needs one, that is the
  // moment to argue for it — not before.
  // The sitemap lists pages only, so it does not declare the news, image,
  // video and hreflang vocabularies it never uses.
  integrations: [
    sitemap({ namespaces: { news: false, image: false, video: false, xhtml: false } }),
  ],
  vite: {
    plugins: [
      tailwindcss(),
      // noExternal bundles every dependency into the server output, so
      // the deployed artifact needs no node_modules beyond the native
      // addon that cannot be bundled. See runtime-externals.ts — that
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
    // Emit scripts as files rather than inlining them. Inline script is
    // the one thing that forces a CSP to carry hashes — a per-page policy
    // regenerated whenever a script changes, which silently becomes a
    // broken page when it is not. External, the whole rule is
    // `script-src 'self'`.
    //
    // It costs nothing. The bytes are identical and the HTML is smaller;
    // and since HTML is no-cache while /_astro is immutable, inline
    // script was re-sent on every navigation where a file is fetched once.
    build: { assetsInlineLimit: 0 },
    ssr: { external: RUNTIME_EXTERNALS },
  },
});
