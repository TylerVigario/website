import { beforeEach, describe, expect, it, vi } from "vitest";
import type { APIContext } from "astro";

/**
 * The API routes are the enhanced path: JSON in, JSON or Problem Details
 * out. A plain form post is not theirs any more; it is forwarded to the
 * page with 307, which makes the browser repeat the POST with its body.
 * A 303 there would turn it into a GET and drop what was typed, which is
 * why the status itself is asserted.
 */
const { insertSubmission } = vi.hoisted(() => ({ insertSubmission: vi.fn(() => 1) }));
vi.mock("@/lib/db", () => ({ insertSubmission, markNotified: vi.fn() }));
vi.mock("@/lib/email/mailer", () => ({
  sendQuoteNotification: vi.fn(() => Promise.resolve(true)),
  sendPotsAuditNotification: vi.fn(() => Promise.resolve(true)),
}));

const { VALIDATION_TYPE } = await import("@/lib/api/error");

const quote = await import("@/pages/api/quote");
const audit = await import("@/pages/api/pots-audit");

const call = (
  route: { POST: (ctx: APIContext) => Response | Promise<Response> },
  request: Request,
) => Promise.resolve(route.POST({ request } as APIContext));
const formPost = (body: string) =>
  new Request("http://x/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
const jsonPost = (body: unknown) =>
  new Request("http://x/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => insertSubmission.mockClear());

describe("a plain form post to the API", () => {
  it.each([
    ["quote", quote, "/contact"],
    ["audit", audit, "/pots-migration#audit"],
  ] as const)(
    "%s is forwarded to its page with 307, storing nothing itself",
    async (_n, route, page) => {
      const res = await call(route, formPost("name=Dana&contact=x&services=Linux"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(page);
      expect(insertSubmission).not.toHaveBeenCalled();
    },
  );
});

describe("the JSON path", () => {
  it("stores a valid quote and answers success", async () => {
    const res = await call(
      quote,
      jsonPost({ name: "Dana", contact: "x", services: ["Custom Software"] }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(insertSubmission).toHaveBeenCalledOnce();
  });

  it("answers an invalid one 422, with the validation problem type", async () => {
    // Read and understood, and the content is what failed: 422, the same
    // status the page answers the no-JS submit with.
    const res = await call(quote, jsonPost({ name: "", contact: "x", services: [] }));
    expect(res.status).toBe(422);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(await res.json()).toMatchObject({ type: VALIDATION_TYPE, status: 422 });
    expect(insertSubmission).not.toHaveBeenCalled();
  });

  it.each([
    ["quote", quote],
    ["audit", audit],
  ] as const)(
    "answers an unreadable %s body 400, not as a validation failure",
    async (_n, route) => {
      const res = await call(
        route,
        new Request("http://x/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{not json",
        }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ type: "about:blank", title: "Bad Request" });
      expect(insertSubmission).not.toHaveBeenCalled();
    },
  );
});
