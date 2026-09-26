import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX, tooLong } from "@/lib/forms/limits";
import type { insertSubmission as InsertSubmission } from "@/lib/db";

/**
 * The one submission path both routes use: the JSON API and the page
 * that takes a no-JS submit. The database and the mailer are replaced
 * by recorders, so each test sees exactly what would have been stored
 * and sent.
 */
const { insertSubmission, sendQuoteNotification, sendPotsAuditNotification } = vi.hoisted(() => ({
  insertSubmission: vi.fn<typeof InsertSubmission>(),
  sendQuoteNotification: vi.fn(),
  sendPotsAuditNotification: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ insertSubmission }));
vi.mock("@/lib/email/mailer", () => ({ sendQuoteNotification, sendPotsAuditNotification }));

const { readSubmission, submitQuote, submitPotsAudit } = await import("@/lib/api/submit");

const QUOTE = {
  name: " Dana ",
  contact: "dana@example.com",
  services: ["Networking & WiFi"],
  details: "",
};
const AUDIT = {
  business: "Acme",
  name: "Dana",
  contact: "559 555 0100",
  bill: "$100–$300",
  details: "two lines",
};

beforeEach(() => {
  vi.clearAllMocks();
  sendQuoteNotification.mockResolvedValue(undefined);
  sendPotsAuditNotification.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("a valid quote", () => {
  it("is stored trimmed, with services joined and empty details as null", async () => {
    expect(await submitQuote(QUOTE)).toEqual({ kind: "saved" });
    expect(insertSubmission).toHaveBeenCalledWith({
      name: "Dana",
      contact: "dana@example.com",
      services: "Networking & WiFi",
      details: null,
    });
    expect(sendQuoteNotification).toHaveBeenCalledOnce();
  });

  it("is still saved when the mail relay is down", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sendQuoteNotification.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await submitQuote(QUOTE)).toEqual({ kind: "saved" });
    expect(insertSubmission).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalled();
  });
});

describe("an invalid submission", () => {
  it("stores nothing, and hands back every value typed and one message per field", async () => {
    const body = { name: "", contact: "", services: ["Custom Software"], details: "kept" };
    const out = await submitQuote(body);
    expect(out.kind).toBe("invalid");
    if (out.kind !== "invalid") return;
    expect(out.values).toEqual(body);
    expect(out.errors).toEqual({
      name: "Please enter your name.",
      contact: "Please enter a phone number or email.",
    });
    expect(insertSubmission).not.toHaveBeenCalled();
  });

  it("is refused past the length limit, with the shared message", async () => {
    const out = await submitQuote({ ...QUOTE, details: "x".repeat(MAX.details + 1) });
    expect(out.kind === "invalid" && out.errors.details).toBe(tooLong(MAX.details));
    expect(insertSubmission).not.toHaveBeenCalled();
  });

  it("is refused for a choice the form does not offer", async () => {
    const bill = await submitPotsAudit({ ...AUDIT, bill: "a range the select never showed" });
    expect(bill.kind === "invalid" && bill.errors.bill).toBe("Pick a range.");
    const svc = await submitQuote({ ...QUOTE, services: ["Something else"] });
    expect(svc.kind === "invalid" && svc.errors.services).toBe("Pick from the listed services.");
    expect(insertSubmission).not.toHaveBeenCalled();
  });

  it("that is not an object at all still comes back as a validation failure", async () => {
    const out = await submitQuote(null);
    expect(out.kind === "invalid" && out.values).toEqual({});
  });
});

describe("the honeypot", () => {
  it("is checked before validation: a trapped body that is also invalid is dropped, not refused", async () => {
    // An error would tell a bot which fields to fix.
    expect(await submitQuote({ website: "http://spam.example" })).toEqual({ kind: "dropped" });
    expect(await submitPotsAudit({ website: "http://spam.example" })).toEqual({ kind: "dropped" });
  });

  it("stores and sends nothing, however valid the rest is", async () => {
    expect(await submitQuote({ ...QUOTE, website: "x" })).toEqual({ kind: "dropped" });
    expect(await submitPotsAudit({ ...AUDIT, website: "x" })).toEqual({ kind: "dropped" });
    expect(insertSubmission).not.toHaveBeenCalled();
    expect(sendQuoteNotification).not.toHaveBeenCalled();
    expect(sendPotsAuditNotification).not.toHaveBeenCalled();
  });
});

describe("reading a request", () => {
  const form = (pairs: [string, string][]) =>
    new Request("http://x/", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(pairs).toString(),
    });

  it("keeps a checkbox group an array with one box ticked, and names an empty one", async () => {
    expect(await readSubmission(form([["services", "Linux"]]), ["services"])).toEqual({
      services: ["Linux"],
    });
    expect(await readSubmission(form([["name", "Dana"]]), ["services"])).toEqual({
      name: "Dana",
      services: [],
    });
  });

  it("reads JSON, and treats malformed JSON as nothing", async () => {
    const json = (body: string) =>
      new Request("http://x/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
    expect(await readSubmission(json('{"name":"Dana"}'))).toEqual({ name: "Dana" });
    expect(await readSubmission(json("{not json"))).toBeNull();
  });
});
