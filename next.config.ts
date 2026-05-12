import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { withSentryConfig } from "@sentry/nextjs";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

// Sentry release identifier. The `service-name@version` shape is
// Sentry's recommended convention — keeps releases unique across
// projects sharing the same Sentry org and is human-readable in
// the dashboard. Set in next.config's `env` block below so the
// same value is available to both server and client (inlined into
// the client bundle at build time, available via process.env on
// the server) and matches what `withSentryConfig` registers for
// source-map upload — same string everywhere or events don't tie
// to maps.
const sentryRelease = `vigario-technology-solutions@${version}`;

const nextConfig: NextConfig = {
  // No `output: "standalone"`. The deploy artifact carries the full
  // node_modules tree, so Next's standalone-tracer minimization
  // isn't required — and that tracer was a source of bugs (NFT
  // graph gaps, loadConfig dynamic requires, custom-server interop
  // edges) that dropping it eliminates wholesale. The artifact-size
  // cost of bundling the tree is acceptable under any deploy shape
  // this repo currently uses. See docs/deployment.md for current
  // shape specifics.
  trailingSlash: false,
  env: { APP_VERSION: version, SENTRY_RELEASE: sentryRelease },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Packages Turbopack should treat as runtime externals — never
  // bundle, always resolve from the artifact's node_modules/ at run
  // time. better-sqlite3 is here because it's a native module that
  // can't be packed. The three instrumentation packages are here to
  // sidestep a known Turbopack bug
  // (https://github.com/vercel/next.js/issues/87737): the bundler
  // emits `require("<pkg>-<contenthash>")` for these externals, and
  // the hashed name doesn't resolve at runtime. Excluding them from
  // bundling means no synthetic name is generated and the OpenTelemetry/
  // Sentry monkey-patch path stays loadable.
  serverExternalPackages: [
    "better-sqlite3",
    "require-in-the-middle",
    "import-in-the-middle",
    "@opentelemetry/instrumentation",
  ],
  headers: () =>
    Promise.resolve([
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              // Sentry tunnel is same-origin (`/monitoring` route) so
              // no third-party connect-src needed; 'self' covers it.
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          // HSTS — enforce HTTPS for 1 year. Subdomain-inclusive so a
          // future `*.vigario.tech` subdomain inherits it. No preload
          // flag yet; add only when the site is settled on its final
          // domain (HSTS preload is hard to roll back).
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Disable browser features the site doesn't use. Tightens
          // the attack surface against injected third-party scripts.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ]),
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider net of client source files so production stack
  // traces resolve back to readable TS — non-negotiable for prod
  // debug ergonomics.
  widenClientFileUpload: true,

  // Same-origin tunnel for events. Two reasons:
  //   1. Bypasses ad-blockers that block requests to *.sentry.io.
  //   2. Our CSP `connect-src 'self'` doesn't allow sentry.io
  //      directly; the tunnel keeps event traffic on the same origin
  //      so the policy doesn't need to broaden.
  tunnelRoute: "/monitoring",

  // Release tracking. SDK init in instrumentation-client.ts +
  // sentry.server.config.ts tags events with the SAME `name` via
  // process.env.SENTRY_RELEASE so events tie back to the release
  // the plugin registered, which is what makes source-map
  // resolution work.
  release: {
    name: sentryRelease,
    setCommits: { auto: true, ignoreMissing: true },
    // Only mark a deploy when running in CI. Plain `next build`
    // locally also has NODE_ENV=production (Next sets it itself),
    // and we don't want a developer's local validation build to
    // register a phantom production deploy event in Sentry.
    ...(process.env.CI ? { deploy: { env: "production" } } : {}),
  },

  // Suppress the wall of build-output unless we're in CI. Local
  // builds stay quiet; CI gets the full source-map upload log.
  silent: !process.env.CI,
});
