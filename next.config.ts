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
  output: "standalone",
  trailingSlash: false,
  env: { APP_VERSION: version, SENTRY_RELEASE: sentryRelease },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // better-sqlite3 is a native module and can't be webpacked.
  // Declaring it external keeps Next from trying to bundle it; the
  // standalone tracer then includes it in node_modules/ via the app's
  // import graph.
  serverExternalPackages: ["better-sqlite3"],
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

  // Release tracking. The plugin will:
  //   1. Create the release in Sentry (`name`)
  //   2. Associate this build's commits via auto-detection (git log
  //      walks back from HEAD to the previous release tag).
  //      `ignoreMissing` keeps a build green when Sentry's GitHub
  //      integration isn't configured yet.
  //   3. Mark the release as deployed to "production" in CI.
  //   4. Finalize (default `true`) — caps off the release window.
  // SDK init in instrumentation-client.ts + sentry.server.config.ts
  // tags events with the SAME `name` via process.env.SENTRY_RELEASE
  // so events tie back to the release the plugin registered, which
  // is what makes source-map resolution work.
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
