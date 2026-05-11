import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { QuoteRequest } from "@/lib/api/quote";
import { zodError } from "@/lib/api/error";
import { sendQuoteNotification } from "@/lib/email/mailer";

export async function POST(req: NextRequest) {
  // .catch(() => null) so a malformed-JSON body becomes a 400
  // (Validation Error) instead of an unhandled throw → Sentry event.
  // Genuine bugs past this point still propagate to onRequestError.
  const body: unknown = await req.json().catch(() => null);
  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) return zodError(parsed);

  const { name, contact, services, details } = parsed.data;

  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)",
  );
  stmt.run(name, contact, services.join(", "), details || null);

  try {
    await sendQuoteNotification({ name, contact, services, details });
  } catch (emailErr) {
    // Email is best-effort; the quote is already saved. mailer.ts
    // also Sentry-captures the failure with redacted context.
    console.error("Failed to send email notification:", emailErr);
  }

  return NextResponse.json({ success: true });
}
