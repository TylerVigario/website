/**
 * Custom server entrypoint.
 *
 * Compiled by scripts/build-server.ts via esbuild → server.js at the
 * repo root. `npm start` (= `node server.js`) is what invokes it.
 * (package.json `type: module` makes plain .js ESM — no .mjs marker
 * needed.)
 *
 * Reason this exists instead of `next start`: graceful SIGTERM/SIGINT
 * — drains in-flight HTTP requests, closes the SQLite handle, flushes
 * Sentry, exits 0. systemd's `systemctl stop` gets a clean exit code
 * so `OnFailure=systemd-failure-notify` stays diagnostic-only. See
 * docs/deployment.md "Shutdown contract".
 *
 * Uses the documented Next custom-server API:
 * `next({...}) + app.prepare() + http.createServer(handle)`. Works
 * because the runtime has the full Next module tree available —
 * `loadConfig`'s dynamic require of `next/dist/compiled/webpack/*`
 * resolves cleanly. Under the prior `output: "standalone"` model
 * the standalone tracer stripped the webpack tree, which broke this
 * pattern at boot. Any deploy shape that ships an un-minimized
 * node_modules (CI tarball, build-on-prod, RPM, image layer, …)
 * satisfies the invariant — server.ts itself is deploy-agnostic.
 */

import next from "next";
import http, { type Server } from "node:http";
import Sentry from "@sentry/nextjs";

// --check escape hatch: exits before app.prepare() so build-time
// smokes can validate module-level imports without booting Next.
// scripts/build-server.ts calls --check after compile to catch
// ERR_MODULE_NOT_FOUND early; scripts/postbuild.ts runs the real
// boot.
if (process.argv.includes("--check")) {
  process.exit(0);
}

const DRAIN_TIMEOUT_MS = 30_000;
const SENTRY_FLUSH_TIMEOUT_MS = 2_000;

// 127.0.0.1 default is safe-by-default — a deploy that comes up
// without an explicit HOSTNAME override is reachable only through
// the local reverse proxy, never the LAN/WAN. Production exposes
// by setting HOSTNAME=0.0.0.0 in its env file.
const port = parseInt(process.env.PORT ?? "", 10) || 3000;
const hostname = process.env.HOSTNAME ?? "127.0.0.1";

const log = (msg: string): void => {
  console.error(`[shutdown] ${msg}`);
};

// ============================================================
// Bootstrap
// ============================================================

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

const httpServer: Server = http.createServer((req, res) => {
  void handle(req, res);
});

httpServer.on("error", (err) => {
  console.error("[server] error:", err);
  process.exit(1);
});

let shuttingDown = false;

// ============================================================
// Shutdown
// ============================================================

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    log(`${signal} arrived during shutdown; ignoring`);
    return;
  }
  shuttingDown = true;
  log(`${signal} received: drain → sqlite → sentry → exit`);

  if (httpServer.listening) {
    httpServer.closeIdleConnections();
    log("closed idle keep-alive connections");

    await new Promise<void>((resolve) => {
      const cap = setTimeout(() => {
        log(`drain hit ${DRAIN_TIMEOUT_MS / 1000}s cap; force-closing in-flight connections`);
        httpServer.closeAllConnections();
        resolve();
      }, DRAIN_TIMEOUT_MS);
      cap.unref();

      httpServer.close((err) => {
        clearTimeout(cap);
        if (err) log(`server.close error: ${err.message}`);
        else log("in-flight requests drained");
        resolve();
      });
    });
  } else {
    log("http server not listening; skip drain");
  }

  try {
    // src/lib/db.ts registers the better-sqlite3 singleton on
    // globalThis (`__sqlite__`). Closing it forces a WAL checkpoint
    // and lets us log any close failure instead of leaving it to
    // process death.
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
    // Default import — namespace `import * as Sentry` doesn't expose
    // Sentry.close under the CJS-via-ESM-namespace shape that
    // @sentry/nextjs ships. Calling close via namespace silently
    // skips the flush.
    await Sentry.close(SENTRY_FLUSH_TIMEOUT_MS);
    log("sentry flushed");
  } catch (err) {
    log(`Sentry.close error: ${err instanceof Error ? err.message : String(err)}`);
  }

  log("exit 0");
  process.exit(0);
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((err) => {
    console.error("[shutdown] uncaught", err);
  });
});
process.on("SIGINT", () => {
  shutdown("SIGINT").catch((err) => {
    console.error("[shutdown] uncaught", err);
  });
});

// ============================================================
// Listen
// ============================================================

httpServer.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
