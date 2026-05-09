import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";
import { QuoteRequest } from "@/lib/api/quote";
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
  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) return zodError(parsed);

  const { name, contact, services, details } = parsed.data;
  const servicesStr = services.join(", ");

  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)",
  );
  stmt.run(name, contact, servicesStr, details || null);

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: `"VTS Website" <${process.env.SMTP_USER}>`,
        to: NOTIFY_EMAIL,
        subject: `New Quote Request from ${name}`,
        text: [
          `Name: ${name}`,
          `Contact: ${contact}`,
          `Services: ${servicesStr}`,
          `Details: ${details || "(none)"}`,
          "",
          `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`,
        ].join("\n"),
        html: `
            <h2>New Quote Request</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Contact</td><td style="padding:8px;">${escapeHtml(contact)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Services</td><td style="padding:8px;">${escapeHtml(servicesStr)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Details</td><td style="padding:8px;">${escapeHtml(details || "(none)")}</td></tr>
            </table>
          `,
      });
    } catch (emailErr) {
      // Email is best-effort; the quote is already saved. Log so it
      // surfaces in journalctl if SMTP credentials drift.
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
