import Database from "better-sqlite3";

// SQLITE_PATH is validated at server startup by src/lib/runtime-config.ts
// (presence + absolute path). By the time getDb() runs, the var is
// guaranteed set — but we still throw rather than `!` because module
// bundling order can let imports run before instrumentation.register().
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
