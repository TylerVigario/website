import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";

export const prerender = false;

/**
 * What a deploy is actually asking when it checks health.
 *
 * A 200 from the homepage only proves the static tree is being served —
 * those are files on disk and would keep serving with this process dead.
 * Reading the database only proves the file opens.
 *
 * The question that matters is whether a submission would survive, and
 * the failures that break that are write failures: a full disk, a
 * filesystem remounted read-only, permissions changed on the state
 * directory, an SELinux denial on the WAL. Every one of those leaves
 * SELECT working. A check that only reads passes cleanly while every
 * form on the site is losing leads.
 */

/** Columns the two POST routes write. Present and named, or an insert
 *  fails at request time instead of here. */
const REQUIRED_COLUMNS = ["name", "contact", "services", "details"];

/** Thrown to unwind the write probe's transaction. Not a failure —
 *  reaching it means the write succeeded and is being undone. */
class Rollback extends Error {}

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export const GET: APIRoute = () => {
  const checks: Check[] = [];
  const record = (name: string, fn: () => void) => {
    try {
      fn();
      checks.push({ name, ok: true });
    } catch (err) {
      // Logged with the stack intact so journald keeps the real fault;
      // the response carries only what a monitor can act on.
      console.error(`[health] ${name} failed:`, err);
      checks.push({ name, ok: false, detail: err instanceof Error ? err.message : String(err) });
    }
  };

  // Opening is its own check, not a precondition. SQLite creates the
  // -wal and -shm files on open, so a read-only state directory — the
  // most likely write failure in production — fails here. Called
  // outside this machinery it crashed the endpoint, and a monitor asking
  // "are you healthy" got an HTML 500 it cannot parse instead of a
  // structured no.
  let db: ReturnType<typeof getDb> | undefined;
  record("open", () => {
    db = getDb();
  });

  if (db) {
    record("readable", () => {
      db!.prepare("SELECT 1 FROM sqlite_schema LIMIT 1").get();
    });

    record("schema", () => {
      const cols = db!
        .prepare("SELECT name FROM pragma_table_info('quotes')")
        .all()
        .map((r) => (r as { name: string }).name);
      if (cols.length === 0) throw new Error("table 'quotes' does not exist");
      const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
      if (missing.length) throw new Error(`quotes is missing column(s): ${missing.join(", ")}`);
    });

    record("writable", () => {
      // A real insert through the real table, rolled back. Exercises the
      // WAL, the file permissions and the schema's constraints — the whole
      // path a submission takes — and leaves nothing behind. A PRAGMA or a
      // scratch table would test a different, easier path than the one
      // that has to work.
      const probe = db!.transaction(() => {
        db!
          .prepare("INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)")
          .run("__healthcheck__", "__healthcheck__", "__healthcheck__", null);
        throw new Rollback();
      });
      try {
        probe();
      } catch (err) {
        if (!(err instanceof Rollback)) throw err;
      }
    });
  }

  const ok = checks.every((c) => c.ok);
  return new Response(JSON.stringify({ status: ok ? "ok" : "unhealthy", checks }), {
    // 503 rather than 500: this is a statement about whether the service
    // can serve, which is what a monitor or a deploy gate is asking.
    status: ok ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
