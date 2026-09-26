import { describe, expect, it, vi } from "vitest";
import { POTS_AUDIT_MARKER } from "../src/lib/api/pots-audit";

import type { insertSubmission as InsertSubmission } from "@/lib/db";

const { insertSubmission } = vi.hoisted(() => ({
  insertSubmission: vi.fn<typeof InsertSubmission>(),
}));
vi.mock("@/lib/db", () => ({ insertSubmission }));
vi.mock("@/lib/email/mailer", () => ({
  sendQuoteNotification: vi.fn(),
  sendPotsAuditNotification: vi.fn(),
}));
const { submitPotsAudit, submitQuote } = await import("@/lib/api/submit");

/**
 * Both forms write to one `quotes` table, and `services` is the only
 * column telling the two kinds of row apart: a real services array for a
 * quote, this literal for an audit.
 *
 * Nothing fails if it changes. Every row written afterwards is simply
 * indistinguishable from a quote, retroactively unrecoverable, with no
 * error anywhere to notice it by.
 */
describe("the audit row marker", () => {
  it("is the exact string the data already on disk was written with", () => {
    expect(POTS_AUDIT_MARKER).toBe("POTS Migration Audit");
  });

  // Behavioural, not a search of the source: a route that mentioned the
  // constant and then inserted something else passed the old version.
  it("is the value an audit submission actually stores", async () => {
    insertSubmission.mockClear();
    await submitPotsAudit({ business: "Acme", name: "Dana", contact: "x", bill: "Under $100" });
    expect(insertSubmission).toHaveBeenCalledOnce();
    expect(insertSubmission.mock.calls[0][0].services).toBe(POTS_AUDIT_MARKER);
  });

  it("is not what a quote stores, which is the services chosen", async () => {
    insertSubmission.mockClear();
    await submitQuote({ name: "Dana", contact: "x", services: ["Linux", "Windows"] });
    expect(insertSubmission.mock.calls[0][0].services).toBe("Linux, Windows");
  });
});
