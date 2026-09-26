import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { APIContext } from "astro";

/**
 * /api/health answers "would a submission be stored", which is a question
 * about writes. It runs against a real SQLite file opened by the real
 * getDb(), so the checks under test are the ones that ship.
 */
let dir: string;
let file: string;
let health: typeof import("@/pages/api/health");

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "vts-health-"));
  file = path.join(dir, "health.db");
  const cache = globalThis as { __sqlite__?: { close(): void } };
  cache.__sqlite__?.close();
  delete cache.__sqlite__;
  process.env.SQLITE_PATH = file;
  health = await import("@/pages/api/health");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const ctx = {} as APIContext;

const get = async () => {
  const res = await Promise.resolve(health.GET(ctx));
  const body = (await res.json()) as { checks: { name: string; ok: boolean; detail?: string }[] };
  return { status: res.status, checks: body.checks };
};

describe("the health check", () => {
  it("passes every check on a healthy database with room to spare", async () => {
    delete process.env.HEALTH_MIN_FREE_MB;
    const { status, checks } = await get();
    expect(status).toBe(200);
    expect(checks.map((c) => c.name)).toEqual(["open", "readable", "schema", "writable", "space"]);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it("reports 503 when free space falls under the minimum", async () => {
    process.env.HEALTH_MIN_FREE_MB = String(Number.MAX_SAFE_INTEGER);
    const { status, checks } = await get();
    expect(status).toBe(503);
    expect(checks.find((c) => c.name === "space")).toMatchObject({ ok: false });
    delete process.env.HEALTH_MIN_FREE_MB;
  });

  it("treats an unreadable minimum as a failure, not as no minimum", async () => {
    process.env.HEALTH_MIN_FREE_MB = "lots";
    const { status, checks } = await get();
    expect(status).toBe(503);
    expect(checks.find((c) => c.name === "space")?.detail).toContain("HEALTH_MIN_FREE_MB=lots");
    delete process.env.HEALTH_MIN_FREE_MB;
  });

  it("can be switched off with 0", async () => {
    process.env.HEALTH_MIN_FREE_MB = "0";
    expect((await get()).status).toBe(200);
    delete process.env.HEALTH_MIN_FREE_MB;
  });

  it("stores no submission while probing", async () => {
    await get();
    const db = new Database(file, { readonly: true });
    expect(db.prepare("SELECT count(*) AS n FROM quotes").get()).toEqual({ n: 0 });
    db.close();
  });

  it("answers HEAD like GET, not 405", async () => {
    const res = await Promise.resolve(health.HEAD(ctx));
    expect(res.status).toBe(200);
  });

  it("names both methods it allows", async () => {
    const res = await Promise.resolve(health.ALL(ctx));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });
});
