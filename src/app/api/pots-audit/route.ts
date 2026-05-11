import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { PotsAuditRequest } from "@/lib/api/pots-audit";
import { zodError } from "@/lib/api/error";
import { sendPotsAuditNotification } from "@/lib/email/mailer";

export async function POST(req: NextRequest) {
  // .catch(() => null) so a malformed-JSON body becomes a 400
  // (Validation Error) instead of an unhandled throw → Sentry event.
  // Genuine bugs past this point still propagate to onRequestError.
  const body: unknown = await req.json().catch(() => null);
  const parsed = PotsAuditRequest.safeParse(body);
  if (!parsed.success) return zodError(parsed);

  const { business, name, contact, bill, details } = parsed.data;

  // Reuse quotes table; the services column tags this as a POTS audit.
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)",
  );
  stmt.run(
    name,
    contact,
    "POTS Migration Audit",
    [`Business: ${business}`, `Monthly bill: ${bill}`, details ? `Details: ${details}` : ""]
      .filter(Boolean)
      .join("\n"),
  );

  try {
    await sendPotsAuditNotification({ business, name, contact, bill, details });
  } catch (emailErr) {
    // Email is best-effort; the audit request is already saved.
    console.error("Failed to send email notification:", emailErr);
  }

  return NextResponse.json({ success: true });
}
