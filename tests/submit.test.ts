import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BODY_LIMIT_BYTES, MAX, tooLong } from "@/lib/forms/limits";
import type { insertSubmission as InsertSubmission } from "@/lib/db";

/**
 * The one submission path both routes use: the JSON API and the page
 * that takes a no-JS submit. The database and the mailer are replaced
 * by recorders, so each test sees exactly what would have been stored
 * and sent.
 */
const { insertSubmission, markNotified, sendQuoteNotification, sendPotsAuditNotification } =
  vi.hoisted(() => ({
    insertSubmission: vi.fn<typeof InsertSubmission>(),
    markNotified: vi.fn(),
    sendQuoteNotification: vi.fn(),
    sendPotsAuditNotification: vi.fn(),
  }));
vi.mock("@/lib/db", () => ({ insertSubmission, markNotified }));
vi.mock("@/lib/email/mailer", () => ({ sendQuoteNotification, sendPotsAuditNotification }));

const { readSubmission, submitQuote, submitPotsAudit, Unreadable } =
  await import("@/lib/api/submit");

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
  insertSubmission.mockReturnValue(42);
  sendQuoteNotification.mockResolvedValue(true);
  sendPotsAuditNotification.mockResolvedValue(true);
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
    expect(sendQuoteNotification).toHaveBeenCalledWith(42, expect.anything());
    expect(markNotified).toHaveBeenCalledWith(42);
  });

  it("is still saved when the mail relay is down, and left unmarked", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sendQuoteNotification.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await submitQuote(QUOTE)).toEqual({ kind: "saved" });
    expect(insertSubmission).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("#42"), expect.any(Error));
    expect(markNotified).not.toHaveBeenCalled();
  });

  it("is left unmarked when mail is off", async () => {
    sendPotsAuditNotification.mockResolvedValue(false);
    expect(await submitPotsAudit(AUDIT)).toEqual({ kind: "saved" });
    expect(markNotified).not.toHaveBeenCalled();
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

  it("logs which form it caught, and nothing that was in it", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await submitPotsAudit({ ...AUDIT, website: "http://spam.example" });
    expect(log).toHaveBeenCalledWith("[honeypot] dropped a POTS audit submission");
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Acme|Dana|spam\.example/);
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
  });

  it("tells a body it could not read from one that failed the schema", async () => {
    const json = (body: string) =>
      new Request("http://x/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
    const read = await readSubmission(json("{not json"));
    expect(read).toEqual(new Unreadable(400));
    expect(await submitQuote(read)).toEqual({ kind: "unreadable", status: 400 });
    expect(insertSubmission).not.toHaveBeenCalled();
  });

  it("answers 413 for a body the adapter cut off past the limit", async () => {
    // What the adapter does to an oversized body: the stream fails partway.
    const cut = () =>
      new Request("http://x/", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "content-length": String(BODY_LIMIT_BYTES + 1),
        },
        body: new ReadableStream({
          pull: (c) => c.error(new Error("Body size limit exceeded")),
        }),
        duplex: "half",
      } as RequestInit);
    expect(await readSubmission(cut())).toEqual(new Unreadable(413));
    expect(await submitPotsAudit(await readSubmission(cut()))).toEqual({
      kind: "unreadable",
      status: 413,
    });
  });
});
