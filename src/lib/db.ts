import { RETENTION_MONTHS } from "@/lib/retention";
import Database from "better-sqlite3";
import path from "node:path";

export function getDbPath(): string {
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

/**
 * Ordered schema migrations. Index 0 takes the database from version 0
 * to 1, index 1 from 1 to 2, and so on; `PRAGMA user_version` records
 * where a file has got to.
 *
 * WHY THIS EXISTS. The schema was one `CREATE TABLE IF NOT EXISTS` and
 * nothing else, which is fine exactly once. Adding a column to a table
 * that already holds rows had no defined path — the CREATE is a no-op on
 * an existing table, so a new column would simply never appear, and the
 * failure would surface as an INSERT rejecting a field that exists in
 * the schema and not on disk. The live database is in that state now:
 * user_version 0, with real submissions in it.
 *
 * MIGRATION 1 IS DELIBERATELY THE EXISTING SCHEMA. On a fresh file it
 * creates the table; on the production file it does nothing, because the
 * table is already there and identical. Either way the file ends at
 * version 1 and every later migration can assume that shape. A migration
 * that only works on an empty database is not a migration.
 *
 * NEVER EDIT A MIGRATION THAT HAS SHIPPED. Databases that already ran it
 * will not run it again, so an edit changes what new files get and
 * nothing else — the two silently diverge. Append a new one instead.
 */
const MIGRATIONS: readonly ((db: Database.Database) => void)[] = [
  // 0 -> 1: the schema as it stood before versioning existed.
  (db) =>
    db.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        services TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
  // 1 -> 2: when the notification email for a row was handed to the relay.
  // NULL means it has not been, so a lead nobody was told about can be
  // found instead of looking like every other. Rows from before this
  // column existed are marked 'unknown': whether they were announced was
  // never recorded, and calling them unannounced would be a guess.
  (db) => {
    db.exec("ALTER TABLE quotes ADD COLUMN notified_at TEXT");
    db.exec("UPDATE quotes SET notified_at = 'unknown'");
  },
];

/** The version a database is brought to. Exported so a test can assert
 *  the two agree rather than trusting the loop. */
export const SCHEMA_VERSION = MIGRATIONS.length;

function migrate(db: Database.Database): void {
  const from = db.pragma("user_version", { simple: true }) as number;
  if (from > MIGRATIONS.length) {
    // Older code against a newer file. Refusing is the only safe answer:
    // the table may have columns this build does not know how to write.
    throw new Error(
      `database is at schema version ${from}, newer than this build understands (${MIGRATIONS.length}). ` +
        `Deploy a build that knows it, or restore an older file.`,
    );
  }
  for (const [i, step] of MIGRATIONS.slice(from).entries()) {
    // One transaction per step, so a failure leaves the version at the
    // last step that fully applied rather than half of the next one.
    db.transaction(() => {
      step(db);
      // A loop index over a literal array, so there is nothing to
      // interpolate but a number — PRAGMA takes no bound parameters.
      db.pragma(`user_version = ${from + i + 1}`);
    })();
  }
}

export function getDb() {
  if (!g.__sqlite__) {
    const db = new Database(getDbPath());
    try {
      db.pragma("journal_mode = WAL");
      // FULL, not better-sqlite3's NORMAL. In WAL mode NORMAL does not
      // sync at each commit, so a power cut or kernel crash can roll back
      // commits that already happened. Here the one that matters is a lead
      // that got its 200, whose sender's browser then cleared the draft:
      // gone from both ends. FULL costs an fsync per submission, which a
      // form this size cannot notice.
      db.pragma("synchronous = FULL");
      // A deleted submission is overwritten with zeros rather than left in
      // the file's free pages, so a lead removed under the retention rule
      // below, or on request, is gone from the database file too.
      db.pragma("secure_delete = ON");
      migrate(db);
    } catch (err) {
      // Nothing caches a handle that failed to set up, so without this
      // every request opened another and left it for the garbage
      // collector: two file descriptors per failed request.
      db.close();
      throw err;
    }
    g.__sqlite__ = db;
    // Retention runs off the request path, so it can never cost a
    // submission: a minute after open, then daily, since the process can
    // run for weeks between releases. A failed sweep is logged with its
    // stack and tried again at the next one. This is a timer, not a route
    // handler, so nothing else would see the error, and letting it escape
    // would take form submission down with the process. unref() so the
    // timers never keep a process alive.
    const sweep = () => {
      try {
        purgeExpired(db);
      } catch (err) {
        console.error("[retention] sweep failed:", err);
      }
    };
    setTimeout(sweep, 60_000).unref();
    setInterval(sweep, 24 * 60 * 60 * 1000).unref();
  }
  return g.__sqlite__;
}

export { RETENTION_MONTHS };

/** Deletes submissions older than RETENTION_MONTHS and returns how many
 *  went. Logs a count, never the content. */
export function purgeExpired(db: Database.Database): number {
  const { changes } = db
    .prepare("DELETE FROM quotes WHERE created_at < datetime('now', ?)")
    .run(`-${RETENTION_MONTHS} months`);
  if (changes > 0) {
    console.log(
      `[retention] removed ${changes} submission(s) older than ${RETENTION_MONTHS} months`,
    );
  }
  return changes;
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

/** Records that the notification for row `id` was handed to the relay. */
export function markNotified(id: number): void {
  getDb().prepare("UPDATE quotes SET notified_at = datetime('now') WHERE id = ?").run(id);
}

/** Submissions older than `minutes` whose notification never went out:
 *  the relay refused it, or mail is off. Recent ones are left out, since a
 *  send may still be in flight. */
export function unannouncedCount(minutes = 10): number {
  const row = getDb()
    .prepare(
      "SELECT count(*) AS n FROM quotes WHERE notified_at IS NULL AND created_at < datetime('now', ?)",
    )
    .get(`-${minutes} minutes`) as { n: number };
  return row.n;
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
