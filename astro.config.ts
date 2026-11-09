import { fileURLToPath } from "node:url";
import { defineConfig, passthroughImageService, sharpImageService } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import browserslist from "browserslist";
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
// reason to touch, and one crashed process taking every static page
// down with it. See "Serving contract" in CLAUDE.md.
const SITE = "https://vigario.tech";

// The browsers the site is built for are named once, as package.json's
// browserslist: Baseline 2022. That is the oldest Baseline year in which
// every browser has cascade layers. Tailwind puts every style in a layer,
// and a browser without layers applies none of them.
//
// Vite cannot read a browserslist (vitejs/vite#11489), so this names the
// same browsers its way: the oldest version of each engine it knows.
// Chrome's oldest covers the browsers built on Chromium (Samsung
// Internet, Opera Mobile and the rest), because a Baseline query picks
// their versions by engine, so none runs an older one. When Vite reads
// the browserslist itself, this goes.
const VITE_BROWSERS: Record<string, string> = {
  chrome: "chrome",
  and_chr: "chrome",
  android: "chrome",
  edge: "edge",
  opera: "opera",
  firefox: "firefox",
  and_ff: "firefox",
  safari: "safari",
  ios_saf: "ios",
};

function cssTarget(): string[] {
  // With no config found, browserslist uses its own defaults, which would
  // build for browsers nobody chose.
  const queries = browserslist.loadConfig({ path: fileURLToPath(new URL(".", import.meta.url)) });
  if (!queries) throw new Error("astro.config.ts: package.json names no browserslist");
  const oldest = new Map<string, number>();
  for (const entry of browserslist(queries)) {
    const [name = "", version = ""] = entry.split(" ");
    const browser = VITE_BROWSERS[name];
    // parseFloat reads a range such as "15.2-15.3" as its first version.
    const v = Number.parseFloat(version);
    if (browser !== undefined && v < (oldest.get(browser) ?? Infinity)) oldest.set(browser, v);
  }
  return [...oldest].map(([browser, v]) => `${browser}${v}`);
}

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
  // Sharp makes every image variant at build time, for the prerendered
  // pages, and nothing at runtime. The two pages rendered per request use
  // no image the build did not make, so the running server has none to
  // process. Its /_image endpoint still exists, since Astro injects it for
  // any server output, and with sharp as the runtime service that endpoint
  // answered 500 (MissingSharp): the release ships sharp's JavaScript
  // bundled into the server and none of its native binary. Passthrough
  // answers with the source file, which is public under /_astro already,
  // and leaves sharp out of the server bundle.
  image: {
    service: { build: sharpImageService(), runtime: passthroughImageService() },
  },
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
      // Bundling copies every dependency's code into dist/server, and the
      // release tarball is a public download of it. MIT and ISC, most of
      // what is bundled, have every copy carry the copyright and
      // permission notice, which the bundle mostly drops. Vite's
      // build.license writes each bundled package's name, version,
      // licence and licence text to one file; check:release reads it.
      //
      // For the server only. The browser scripts bundle nothing of
      // anyone else's, so the client's file would say exactly that, from
      // a site that serves the Geist font files to every visitor.
      //
      // Not the default name. That is .vite/license.md, and the build
      // deletes .vite/ from each output directory once it has read the
      // manifests there, so the file was written and then removed.
      {
        name: "vigario:third-party-licences",
        configEnvironment(name) {
          if (name !== "ssr") return;
          return { build: { license: { fileName: "THIRD-PARTY-LICENSES.md" } } };
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
    //
    // cssTarget: the browsers above. Astro builds with `target: "esnext"`,
    // which names no browser; Vite hands that to Lightning CSS to minify
    // the CSS, and with no browser to serve it dropped prefixes Tailwind
    // had added. The nav's blur lost -webkit-backdrop-filter, which Safari
    // before 18 needs to render it. Tailwind compiles for newer browsers
    // than these (Chrome 111, Firefox 128, Safari 16.4, hard-coded in
    // @tailwindcss/node), so the minifier also writes what the older ones
    // need: a hex fallback for each lab(), oklab() and oklch() colour,
    // which Chrome before 111 and Firefox before 113 ignore, and min-width
    // breakpoints, because Safari before 16.4 ignores `width >=`. The
    // JavaScript target stays esnext.
    build: {
      assetsInlineLimit: 0,
      cssTarget: cssTarget(),
    },
    ssr: { external: RUNTIME_EXTERNALS },
  },
});
