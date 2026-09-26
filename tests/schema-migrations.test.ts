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
    // Step one is CREATE TABLE IF NOT EXISTS, so re-running it can neither
    // throw nor be seen on a normal file, and "the version did not change"
    // would pass whether the loop repeated it or not. So move the table
    // aside first: a repeated step one would leave a new, empty `quotes`
    // behind, and that is observable.
    const db = await openAt("twice.db");
    db.getDb().exec("ALTER TABLE quotes RENAME TO quotes_moved");
    const first = version("twice.db");
    const again = await openAt("twice.db");
    const handle = again.getDb();
    expect(version("twice.db")).toBe(first);
    expect(
      handle.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name = 'quotes'").get(),
      "a migration that already ran was run again",
    ).toEqual({ n: 0 });
  });

  it("syncs every commit (synchronous = FULL)", async () => {
    // NORMAL, better-sqlite3's default in WAL mode, can lose commits that
    // already returned on a power cut: a lead that got its 200, gone.
    const db = await openAt("sync.db");
    expect(db.getDb().pragma("synchronous", { simple: true })).toBe(2);
  });

  it.skipIf(process.platform !== "linux")("does not leak a handle when opening fails", async () => {
    // A file this build refuses is the simplest way to make getDb()
    // fail after the handle is open. Each failed call used to leave two
    // descriptors (the file and its WAL) for the garbage collector.
    const ahead = path.join(dir, "leak.db");
    const seed = new Database(ahead);
    seed.pragma("user_version = 99");
    seed.close();
    const { readdirSync, readlinkSync } = await import("node:fs");
    const open = () =>
      readdirSync("/proc/self/fd").filter((fd) => {
        try {
          return readlinkSync(`/proc/self/fd/${fd}`).startsWith(ahead);
        } catch {
          return false;
        }
      }).length;
    const db = await openAt("leak.db");
    for (let i = 0; i < 20; i++) expect(() => db.getDb()).toThrow();
    expect(open()).toBe(0);
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
