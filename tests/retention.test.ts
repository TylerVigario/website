import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * The privacy page promises that a submission is deleted after
 * RETENTION_MONTHS. This holds the database to it: rows older than that
 * go, rows inside it stay, and the number is the one the page names. The
 * sweep runs from a timer, never when a request opens the database, so a
 * purge can never fail a submission.
 */
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "vts-retention-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function freshDb(file: string) {
  const mod = await import("@/lib/db");
  const cache = globalThis as { __sqlite__?: { close(): void } };
  cache.__sqlite__?.close();
  delete cache.__sqlite__;
  process.env.SQLITE_PATH = path.join(dir, file);
  return mod;
}

describe("submissions are kept for RETENTION_MONTHS and no longer", () => {
  it("promises 24 months, the number the privacy page states", async () => {
    const { RETENTION_MONTHS } = await freshDb("a.db");
    expect(RETENTION_MONTHS).toBe(24);
  });

  it("deletes only rows older than the limit, and says how many", async () => {
    const { getDb, purgeExpired } = await freshDb("b.db");
    const db = getDb();
    const add = db.prepare(
      "INSERT INTO quotes (name, contact, services, created_at) VALUES (?, 'x@example.com', 'x', datetime('now', ?, ?))",
    );
    add.run("old", "-30 months", "+0 days");
    add.run("just-past", "-24 months", "-1 day");
    add.run("just-inside", "-24 months", "+1 day");
    add.run("new", "-1 day", "+0 days");

    expect(purgeExpired(db)).toBe(2);
    const left = db
      .prepare("SELECT name FROM quotes ORDER BY id")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(left).toEqual(["just-inside", "new"]);
    expect(purgeExpired(db)).toBe(0);
  });

  it("never runs on the request path: opening the database deletes nothing", async () => {
    const { getDb } = await freshDb("c.db");
    getDb().exec(
      "INSERT INTO quotes (name, contact, services, created_at) VALUES ('old', 'x@example.com', 'x', datetime('now', '-30 months'))",
    );
    const { getDb: reopen } = await freshDb("c.db");
    expect(reopen().prepare("SELECT count(*) AS n FROM quotes").get()).toEqual({ n: 1 });
  });
});
