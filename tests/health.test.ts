import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
// The mailer's state comes from SMTP_* in the environment; pinned here so
// a shell that exports them cannot change what these tests see.
const mail = vi.hoisted(() => ({ mailState: "off" }));
vi.mock("@/lib/email/mailer", () => mail);

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

type Check = { name: string; ok: boolean; advisory?: true };
const get = async () => {
  const res = await Promise.resolve(health.GET(ctx));
  const body = (await res.json()) as { status: string; checks: Check[] };
  return { status: res.status, state: body.status, checks: body.checks };
};
const required = (checks: Check[]) => checks.filter((c) => !c.advisory);

describe("the health check", () => {
  it("passes every check on a healthy database with room to spare", async () => {
    delete process.env.HEALTH_MIN_FREE_MB;
    const { status, checks } = await get();
    expect(status).toBe(200);
    expect(required(checks).map((c) => c.name)).toEqual([
      "open",
      "readable",
      "schema",
      "writable",
      "space",
    ]);
    expect(required(checks).every((c) => c.ok)).toBe(true);
  });

  it("reports mail being off as degraded, and keeps the 200", async () => {
    // The updater rolls a release back on anything but a 200, and a
    // rollback cannot fix SMTP settings.
    const { status, state, checks } = await get();
    expect(status).toBe(200);
    expect(state).toBe("degraded");
    expect(checks.find((c) => c.name === "mail")).toEqual({
      name: "mail",
      ok: false,
      advisory: true,
    });
    mail.mailState = "on";
    expect((await get()).state).toBe("ok");
    mail.mailState = "off";
  });

  it("counts a lead that was saved but never announced", async () => {
    const db = new Database(file);
    db.prepare(
      "INSERT INTO quotes (name, contact, services, created_at) VALUES ('x', 'x', 'x', datetime('now', '-1 hour'))",
    ).run();
    db.close();
    const { status, checks } = await get();
    expect(status).toBe(200);
    expect(checks.find((c) => c.name === "notified")).toMatchObject({ ok: false, advisory: true });
    const clean = new Database(file);
    clean.exec("DELETE FROM quotes");
    clean.close();
    expect((await get()).checks.find((c) => c.name === "notified")?.ok).toBe(true);
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
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, checks } = await get();
    expect(status).toBe(503);
    // The reason goes to the journal. The endpoint is public, so the
    // response says which check failed and nothing about why.
    expect(checks.find((c) => c.name === "space")).toEqual({ name: "space", ok: false });
    const logged = log.mock.calls.find(([line]) => line === "[health] space failed:");
    expect((logged?.[1] as Error).message).toContain("HEALTH_MIN_FREE_MB=lots");
    log.mockRestore();
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
