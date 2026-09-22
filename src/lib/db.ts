import Database from "better-sqlite3";
import path from "node:path";

function getDbPath(): string {
  const p = process.env.SQLITE_PATH;
  if (!p) {
    throw new Error("SQLITE_PATH is not set. Copy .env.example to .env.local for development.");
  }
  // Relative paths resolve against the process working directory, which
  // the app does not control — the same configuration would mean a
  // different file depending on how the service was started. Caught here
  // rather than at import time so a failure names the variable instead
  // of surfacing later as a database error.
  if (!path.isAbsolute(p)) {
    throw new Error(
      `SQLITE_PATH must be an absolute path (got "${p}"). Relative paths resolve against the process working directory, which depends on how the process was started.`,
    );
  }
  return p;
}

// Singleton on globalThis rather than a module-level const: the SSR
// bundle can be evaluated more than once, and a second Database handle
// on the same file is a second connection with its own WAL view.
//
// It used to be reachable here so the Next-era server.js could close it
// on shutdown and force a WAL checkpoint. That entrypoint is gone and
// @astrojs/node installs no such hook, so nothing closes it now —
// better-sqlite3's WAL survives an uncleaned exit, so this costs
// durability nothing, but it does mean process death is the only
// close.
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

/** The columns a submission writes. Named once, here, because both
 *  endpoints write the same row and each used to carry its own copy of
 *  the INSERT. Two copies of a column list are two things to keep in
 *  step with the table, and nothing was checking either of them. */
export const SUBMISSION_COLUMNS = ["name", "contact", "services", "details"] as const;

export interface Submission {
  name: string;
  contact: string;
  /** A real services list for a quote; POTS_AUDIT_MARKER for an audit. */
  services: string;
  details: string | null;
}

/** Writes one submission and returns its row id.
 *
 *  The single place the table is written. A field added to a request
 *  schema without a column here fails to compile rather than at INSERT
 *  time, on a real submission, in production — which is where the
 *  duplicated statements would have failed, on the one path this site
 *  exists to serve.
 */
export function insertSubmission(row: Submission): number {
  const cols = SUBMISSION_COLUMNS.join(", ");
  const placeholders = SUBMISSION_COLUMNS.map(() => "?").join(", ");
  const stmt = getDb().prepare(`INSERT INTO quotes (${cols}) VALUES (${placeholders})`);
  const info = stmt.run(...SUBMISSION_COLUMNS.map((c) => row[c]));
  return Number(info.lastInsertRowid);
}
