import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/db";

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
  try {
    const body = await req.json();
    const { business, name, contact, bill, details } = body;

    if (!business?.trim() || !name?.trim() || !contact?.trim() || !bill?.trim()) {
      return NextResponse.json(
        { error: "Business name, your name, contact info, and bill range are required." },
        { status: 400 }
      );
    }

    // Save to SQLite (reuse quotes table with service = "POTS Migration Audit")
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)"
    );
    stmt.run(
      name.trim(),
      contact.trim(),
      "POTS Migration Audit",
      [
        `Business: ${business.trim()}`,
        `Monthly bill: ${bill.trim()}`,
        details?.trim() ? `Details: ${details.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );

    // Send email notification
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"VTS Website" <${process.env.SMTP_USER}>`,
          to: NOTIFY_EMAIL,
          subject: `POTS Audit Request from ${business.trim()}`,
          text: [
            `Business: ${business.trim()}`,
            `Name: ${name.trim()}`,
            `Contact: ${contact.trim()}`,
            `Monthly Bill: ${bill.trim()}`,
            `Details: ${details?.trim() || "(none)"}`,
            "",
            `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`,
            `Source: /pots-migration landing page`,
          ].join("\n"),
          html: `
            <h2>POTS Migration Audit Request</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:8px;font-weight:bold;">Business</td><td style="padding:8px;">${escapeHtml(business.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${escapeHtml(name.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Contact</td><td style="padding:8px;">${escapeHtml(contact.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Monthly Bill</td><td style="padding:8px;">${escapeHtml(bill.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Details</td><td style="padding:8px;">${escapeHtml(details?.trim() || "(none)")}</td></tr>
            </table>
            <p style="color:#78716c;font-size:12px;margin-top:16px;">Source: /pots-migration landing page</p>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POTS audit submission error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or call us directly." },
      { status: 500 }
    );
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
