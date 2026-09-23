import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Migrations have to work on the database that already exists, not just
 * on a fresh one. The live file predates versioning — user_version 0,
 * with real submissions in it — so the interesting case is not "does it
 * build a schema" but "does it adopt one that is already there without
 * touching the rows".
 *
 * Each test opens its own file through the real getDb(), by pointing
 * SQLITE_PATH at it and re-importing, so what runs is the code that
 * ships rather than a copy of the loop.
 */
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "vts-migrate-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** getDb caches its handle on globalThis and reads SQLITE_PATH at call
 *  time, so pointing the variable at another file and dropping the
 *  handle is all a fresh open needs — no module juggling. */
async function openAt(file: string) {
  const mod = await import("@/lib/db");
  const cache = globalThis as { __sqlite__?: { close(): void } };
  cache.__sqlite__?.close();
  delete cache.__sqlite__;
  process.env.SQLITE_PATH = path.join(dir, file);
  return mod;
}

const version = (file: string): number => {
  const db = new Database(path.join(dir, file), { readonly: true });
  const v = db.pragma("user_version", { simple: true }) as number;
  db.close();
  return v;
};

describe("schema migrations", () => {
  it("brings a new database to the current version", async () => {
    const db = await openAt("fresh.db");
    db.getDb();
    expect(version("fresh.db")).toBe(db.SCHEMA_VERSION);
    expect(db.SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it("adopts a pre-versioning database without disturbing its rows", async () => {
    // Exactly the live file's situation: the table exists, it holds
    // submissions, and user_version has never been set.
    const legacy = path.join(dir, "legacy.db");
    const seed = new Database(legacy);
    seed.exec(`
      CREATE TABLE quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        services TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    seed
      .prepare("INSERT INTO quotes (name, contact, services) VALUES (?, ?, ?)")
      .run("Existing", "existing@example.com", "Networking");
    expect(seed.pragma("user_version", { simple: true })).toBe(0);
    seed.close();

    const db = await openAt("legacy.db");
    const handle = db.getDb();
    expect(version("legacy.db")).toBe(db.SCHEMA_VERSION);
    const row = handle.prepare("SELECT name FROM quotes").get() as { name: string };
    expect(row.name).toBe("Existing");
    expect(handle.prepare("SELECT count(*) AS n FROM quotes").get()).toEqual({ n: 1 });
  });

  it("does not re-run on an already-migrated database", async () => {
    const db = await openAt("twice.db");
    db.getDb();
    const first = version("twice.db");
    // A second open must be a no-op — re-running a migration that
    // created a table would throw, and one that added a column would
    // corrupt it.
    const again = await openAt("twice.db");
    expect(() => again.getDb()).not.toThrow();
    expect(version("twice.db")).toBe(first);
  });

  it("refuses a database newer than the build understands", async () => {
    const ahead = path.join(dir, "ahead.db");
    const seed = new Database(ahead);
    seed.pragma("user_version = 99");
    seed.close();
    const db = await openAt("ahead.db");
    // Serving against a schema this code cannot write is worse than not
    // serving: it would fail per-submission instead of at startup.
    expect(() => db.getDb()).toThrow(/newer than this build understands/);
  });
});
