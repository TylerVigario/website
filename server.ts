/**
 * Custom entrypoint for the standalone Next.js server.
 *
 * Compiled by scripts/build-server.ts via esbuild → bin/server.mjs,
 * then copied to .next/standalone/server.mjs by scripts/postbuild.ts
 * (the tarball-root path that MANIFEST.startCommand targets).
 *
 * Replaces direct invocation of the auto-generated `server.js` so we
 * can drain in-flight requests, close the SQLite handle, flush queued
 * Sentry envelopes, and exit 0 on SIGTERM/SIGINT instead of dying 143
 * mid-response (which made `OnFailure=systemd-failure-notify` fire on
 * every deploy). See docs/deployment.md "Shutdown contract".
 *
 * Bundled-from-TypeScript so the entry can declare its own runtime
 * contract via @vercel/nft (build-server.ts walks this bundle's
 * import graph and feeds the result into next.config's
 * outputFileTracingIncludes). v1.2.0 shipped a hand-written .mjs
 * postbuild-copied alongside the standalone — Next's tracer never
 * saw server.mjs's own imports, the standalone tar landed without
 * @sentry/nextjs's package.json, prod died with ERR_MODULE_NOT_FOUND
 * on swap. Same pattern vis-daily-tracker uses for bin/seed.js etc.
 */

import { createServer, type Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";
import * as Sentry from "@sentry/nextjs";

// --check escape hatch — used by scripts/build-server.ts and
// scripts/postbuild.ts as smoke tests that exercise module-level
// imports without starting the server. Must come after imports
// (ESM constraint) but before any side-effecting setup.
if (process.argv.includes("--check")) {
  process.exit(0);
}

const DRAIN_TIMEOUT_MS = 30_000;
const SENTRY_FLUSH_TIMEOUT_MS = 2_000;

const log = (msg: string): void => {
  console.error(`[shutdown] ${msg}`);
};

let httpServer: Server | null = null;
let listening = false;
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    log(`${signal} arrived during shutdown; ignoring`);
    return;
  }
  shuttingDown = true;
  log(`${signal} received: drain → sqlite → sentry → exit`);

  if (httpServer && listening) {
    const server = httpServer;
    server.closeIdleConnections();
    log("closed idle keep-alive connections");

    await new Promise<void>((resolve) => {
      const cap = setTimeout(() => {
        log(`drain hit ${DRAIN_TIMEOUT_MS / 1000}s cap; force-closing in-flight connections`);
        server.closeAllConnections();
        resolve();
      }, DRAIN_TIMEOUT_MS);
      cap.unref();

      server.close((err) => {
        clearTimeout(cap);
        if (err) log(`server.close error: ${err.message}`);
        else log("in-flight requests drained");
        resolve();
      });
    });
  } else {
    log("http server not yet listening; skip drain");
  }

  try {
    // src/lib/db.ts registers the better-sqlite3 singleton on globalThis
    // (`__sqlite__`). Closing it forces a WAL checkpoint and lets us log
    // any close failure instead of leaving it to process death.
    const g = globalThis as unknown as { __sqlite__?: { close: () => void } };
    const db = g.__sqlite__;
    if (db && typeof db.close === "function") {
      db.close();
      log("sqlite closed");
    } else {
      log("no sqlite handle on globalThis; skip");
    }
  } catch (err) {
    log(`sqlite close error: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    await Sentry.close(SENTRY_FLUSH_TIMEOUT_MS);
    log("sentry flushed");
  } catch (err) {
    log(`Sentry.close error: ${err instanceof Error ? err.message : String(err)}`);
  }

  log("exit 0");
  process.exit(0);
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((err) => console.error("[shutdown] uncaught", err));
});
process.on("SIGINT", () => {
  shutdown("SIGINT").catch((err) => console.error("[shutdown] uncaught", err));
});

const dir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(dir);
// @types/node 24 narrowed NODE_ENV to readonly. Next's own
// auto-generated server.js writes it the same way; we mirror.
(process.env as { NODE_ENV?: string }).NODE_ENV = "production";

const port = parseInt(process.env.PORT ?? "", 10) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, dir, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

httpServer = createServer((req, res) => {
  void handle(req, res);
});
httpServer.on("error", (err) => {
  console.error("[server] listen/runtime error:", err);
  process.exit(1);
});
httpServer.listen(port, hostname, () => {
  listening = true;
  console.log(`> Ready on http://${hostname}:${port}`);
});
