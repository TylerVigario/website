import type { APIRoute } from "astro";
import { methodNotAllowed } from "@/lib/api/error";
import { statfsSync } from "node:fs";
import path from "node:path";
import { getDb, getDbPath, SUBMISSION_COLUMNS, insertSubmission, unannouncedCount } from "@/lib/db";
import { mailState } from "@/lib/email/mailer";

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
 *
 * Two checks are advisory: whether mail is on, and whether every lead
 * older than ten minutes was announced. They answer "would I hear about
 * a submission", which matters, but a failure there is the relay's or the
 * host's configuration rather than this release. The updater rolls a
 * release back on anything but a 200, and rolling back cannot fix SMTP
 * settings, so an advisory failure reports "degraded" and keeps the 200.
 *
 * The response names each check and whether it passed, and nothing more.
 * This endpoint is public, and a failure's message can carry a path, a
 * column list or the disk's free space; that goes to the journal, with
 * the stack, where the person fixing it will look.
 */

/** Columns the two POST routes write — imported, not restated. This
 *  file used to carry its own copy beside its own INSERT, which made
 *  four independent column lists across three files with nothing
 *  checking any of them against the table. */
const REQUIRED_COLUMNS: readonly string[] = SUBMISSION_COLUMNS;

/** Free space below which the service reports itself unable to take
 *  submissions. 64 MB is some 250 of the largest request the adapter will
 *  accept (256 KB). HEALTH_MIN_FREE_MB overrides it; 0 turns the check off. */
const DEFAULT_MIN_FREE_MB = 64;

/** Thrown to unwind the write probe's transaction. Not a failure —
 *  reaching it means the write succeeded and is being undone. */
class Rollback extends Error {}

interface Check {
  name: string;
  ok: boolean;
  /** Reported, but never what decides the status code. */
  advisory?: true;
}

export const GET: APIRoute = () => {
  const checks: Check[] = [];
  const record = (name: string, fn: () => void, advisory = false) => {
    try {
      fn();
      checks.push({ name, ok: true, ...(advisory ? { advisory } : {}) });
    } catch (err) {
      // Logged with the stack intact so journald keeps the real fault;
      // the response carries only what a monitor can act on. An advisory
      // failure is a state, not a fault, so it gets its reason and no stack.
      if (advisory)
        console.warn(`[health] ${name}: ${err instanceof Error ? err.message : String(err)}`);
      else console.error(`[health] ${name} failed:`, err);
      checks.push({ name, ok: false, ...(advisory ? { advisory } : {}) });
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
        // Through insertSubmission, so the probe exercises the exact
        // statement a submission uses rather than a copy that could drift
        // into passing while the real one fails.
        insertSubmission({
          name: "__healthcheck__",
          contact: "__healthcheck__",
          services: "__healthcheck__",
          details: null,
        });
        throw new Rollback();
      });
      try {
        probe();
      } catch (err) {
        if (!(err instanceof Rollback)) throw err;
      }
    });

    record("space", () => {
      // The failure a submission is likeliest to meet, and the one no
      // write probe can see coming. A full disk was measured: the rolled-
      // back INSERT above kept passing, and so did a committed write to a
      // row that already exists, because neither needs new space, while
      // every real submission, which grows the database, failed with
      // "database or disk is full". Free space is the only signal that
      // answers "is there room for the next lead", and it answers before
      // the leads start failing rather than after.
      const raw = process.env.HEALTH_MIN_FREE_MB;
      const minMb = raw ? Number(raw) : DEFAULT_MIN_FREE_MB;
      if (!Number.isFinite(minMb) || minMb < 0) {
        throw new Error(`HEALTH_MIN_FREE_MB=${raw} is not a number of megabytes`);
      }
      const fs = statfsSync(path.dirname(getDbPath()));
      const freeMb = (fs.bavail * fs.bsize) / 1024 / 1024;
      if (freeMb < minMb) {
        throw new Error(
          `${freeMb.toFixed(2)} MB free where the database lives, under the ${minMb} MB minimum`,
        );
      }
    });

    record(
      "notified",
      () => {
        const n = unannouncedCount();
        if (n > 0) throw new Error(`${n} submission(s) saved but never announced`);
      },
      true,
    );
  }

  record(
    "mail",
    () => {
      if (mailState === "off") {
        throw new Error("mail is off: none of SMTP_HOST, SMTP_USER, SMTP_PASS is set");
      }
      if (mailState === "misconfigured") {
        throw new Error(
          "mail is misconfigured: the [Mailer] MISCONFIGURED line at startup says why",
        );
      }
    },
    true,
  );

  const ok = checks.every((c) => c.ok || c.advisory);
  const status = !ok ? "unhealthy" : checks.every((c) => c.ok) ? "ok" : "degraded";
  return new Response(JSON.stringify({ status, checks }), {
    // 503 rather than 500: this is a statement about whether the service
    // can serve, which is what a monitor or a deploy gate is asking.
    status: ok ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};

/** HEAD is a GET without the body. Astro picks an export or ALL before it
 *  falls back from HEAD to GET, so without this a monitor that probes with
 *  HEAD got 405 from a healthy service. */
export const HEAD: APIRoute = (ctx) => GET(ctx);

/** Anything else. A monitor that POSTs here has a bug, and should be told
 *  so rather than handed an HTML 404 suggesting the endpoint moved. */
export const ALL: APIRoute = () => methodNotAllowed(["GET", "HEAD"]);
