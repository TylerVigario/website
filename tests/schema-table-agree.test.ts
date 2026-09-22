import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { QuoteRequest } from "@/lib/api/quote";
import { PotsAuditRequest } from "@/lib/api/pots-audit";

/**
 * Proves the request schemas, the write, and the table agree.
 *
 * The client and the server were already held together: form-rules.test.ts
 * checks rules.ts against the zod schemas in both directions. The server
 * and the DATABASE had no such check. A field added to a schema without a
 * column, or a column made NOT NULL without a value, failed at INSERT —
 * at request time, on a real submission, on the one path this site exists
 * to serve, with the row lost and only a stack trace in the journal.
 *
 * These assertions run against a real SQLite file created by the real
 * getDb(), not a fixture, so the schema under test is the one that ships.
 */
let dir: string;
let db: typeof import("@/lib/db");

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "vts-schema-"));
  process.env.SQLITE_PATH = path.join(dir, "test.db");
  db = await import("@/lib/db");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

interface ColumnInfo {
  name: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}
const columns = (): ColumnInfo[] =>
  db.getDb().prepare("PRAGMA table_info(quotes)").all() as ColumnInfo[];

describe("the write and the table", () => {
  it("writes only columns the table actually has", () => {
    const names = columns().map((c) => c.name);
    for (const col of db.SUBMISSION_COLUMNS) expect(names).toContain(col);
  });

  it("supplies every column that would otherwise reject the insert", () => {
    // A NOT NULL column with no default and no place in SUBMISSION_COLUMNS
    // makes every submission fail. The primary key is exempt: SQLite fills
    // it. This is the assertion that catches a schema change made in the
    // table without a corresponding change to the write.
    const unsatisfiable = columns().filter(
      (c) =>
        c.notnull === 1 &&
        c.dflt_value === null &&
        c.pk === 0 &&
        !(db.SUBMISSION_COLUMNS as readonly string[]).includes(c.name),
    );
    expect(unsatisfiable.map((c) => c.name)).toEqual([]);
  });

  it("round-trips a real submission through the real statement", () => {
    const id = db.insertSubmission({
      name: "Ada",
      contact: "ada@example.com",
      services: "Networking",
      details: null,
    });
    const row = db.getDb().prepare("SELECT * FROM quotes WHERE id = ?").get(id) as Record<
      string,
      unknown
    >;
    expect(row.name).toBe("Ada");
    expect(row.services).toBe("Networking");
    expect(row.details).toBeNull();
    // Defaulted rather than written, so it proves the default fires.
    expect(row.created_at).toBeTruthy();
  });
});

describe("the request schemas and the table", () => {
  it("has a column for every field a quote submits", () => {
    const names = columns().map((c) => c.name);
    for (const field of Object.keys(QuoteRequest.shape)) expect(names).toContain(field);
  });

  it("accounts for every field a POTS audit submits", () => {
    // A POTS audit carries two fields the table has no column for: they
    // are folded into `details` by the route, deliberately, because both
    // forms share one table. Listed explicitly so ADDING a third field
    // fails here rather than being silently dropped on the way to disk.
    const FOLDED_INTO_DETAILS = ["business", "bill"];
    const names = columns().map((c) => c.name);
    const unaccounted = Object.keys(PotsAuditRequest.shape).filter(
      (f) => !names.includes(f) && !FOLDED_INTO_DETAILS.includes(f),
    );
    expect(unaccounted).toEqual([]);
  });
});
