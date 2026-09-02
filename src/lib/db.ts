import Database from "better-sqlite3";
import { validateRuntimeConfig } from "./runtime-config";

// Validate as this module loads, which is the earliest point the app can
// refuse to run with bad configuration.
//
// This used to be called from src/instrumentation.ts, Next's startup
// hook. That file went with the Astro migration and nothing replaced the
// call, so for a while the check existed and never ran: a missing
// SQLITE_PATH surfaced as a database error on the first submission, and
// a relative one silently resolved against the process working
// directory and put the database somewhere nobody intended.
//
// Module scope is safe here because the build does not execute this
// module — verified by building with SQLITE_PATH unset. Only the /api
// routes import it and they are `prerender = false`, so nothing runs
// them until a request arrives.
validateRuntimeConfig();

// getDbPath still checks, rather than asserting with `!`, because the
// validator guarantees the variable at load time and this reads it
// later — cheap insurance against that ordering ever changing.
function getDbPath(): string {
  const p = process.env.SQLITE_PATH;
  if (!p) {
    throw new Error("SQLITE_PATH is not set. Copy .env.example to .env.local for development.");
  }
  return p;
}

// Singleton stored on globalThis so server.js's shutdown handler can
// find and close it before exit (forces the WAL checkpoint and
// surfaces close failures via the [shutdown] log lines, instead of
// relying on process death). Same pattern vis-daily-tracker uses for
// its Prisma client.
const g = globalThis as unknown as { __sqlite__?: Database.Database };

export function getDb() {
  if (!g.__sqlite__) {
    const db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        services TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    g.__sqlite__ = db;
  }
  return g.__sqlite__;
}
