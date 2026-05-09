import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";
import { PotsAuditRequest } from "@/lib/api/pots-audit";
import { zodError } from "@/lib/api/error";

const NOTIFY_EMAIL = "tylervigario90@gmail.com";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  // .catch(() => null) so a malformed-JSON body becomes a 400
  // (Validation Error) instead of an unhandled throw → Sentry event.
  // Genuine bugs past this point still propagate to onRequestError.
  const body: unknown = await req.json().catch(() => null);
  const parsed = PotsAuditRequest.safeParse(body);
  if (!parsed.success) return zodError(parsed);

  const { business, name, contact, bill, details } = parsed.data;

  // Reuse quotes table; service column tags this as a POTS audit.
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

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"VTS Website" <${process.env.SMTP_USER}>`,
        to: NOTIFY_EMAIL,
        subject: `POTS Audit Request from ${business}`,
        text: [
          `Business: ${business}`,
          `Name: ${name}`,
          `Contact: ${contact}`,
          `Monthly Bill: ${bill}`,
          `Details: ${details || "(none)"}`,
          "",
          `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`,
          `Source: /pots-migration landing page`,
        ].join("\n"),
        html: `
            <h2>POTS Migration Audit Request</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:8px;font-weight:bold;">Business</td><td style="padding:8px;">${escapeHtml(business)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Contact</td><td style="padding:8px;">${escapeHtml(contact)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Monthly Bill</td><td style="padding:8px;">${escapeHtml(bill)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Details</td><td style="padding:8px;">${escapeHtml(details || "(none)")}</td></tr>
            </table>
            <p style="color:#78716c;font-size:12px;margin-top:16px;">Source: /pots-migration landing page</p>
          `,
      });
    } catch (emailErr) {
      // Email is best-effort; the audit request is already saved.
      console.error("Failed to send email notification:", emailErr);
    }
  }

  return NextResponse.json({ success: true });
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
