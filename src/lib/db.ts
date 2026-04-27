import Database from "better-sqlite3";

// SQLITE_PATH must be the absolute (or workspace-relative for dev)
// path to the .db file. Prod sets this in /opt/website/.env so the
// database file lives outside the release dir and survives swaps;
// dev sets it in .env.local. See .env.example.
function getDbPath(): string {
  const p = process.env.SQLITE_PATH;
  if (!p) {
    throw new Error("SQLITE_PATH is not set. Copy .env.example to .env.local for development.");
  }
  return p;
}

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(getDbPath());
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
  }
  return db;
}
