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
    const { name, contact, services, details } = body;

    if (!name?.trim() || !contact?.trim() || !services?.length) {
      return NextResponse.json(
        { error: "Name, contact info, and at least one service are required." },
        { status: 400 }
      );
    }

    const servicesStr = Array.isArray(services) ? services.join(", ") : services;

    // Save to SQLite
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)"
    );
    stmt.run(name.trim(), contact.trim(), servicesStr, details?.trim() || null);

    // Send email notification
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"VTS Website" <${process.env.SMTP_USER}>`,
          to: NOTIFY_EMAIL,
          subject: `New Quote Request from ${name.trim()}`,
          text: [
            `Name: ${name.trim()}`,
            `Contact: ${contact.trim()}`,
            `Services: ${servicesStr}`,
            `Details: ${details?.trim() || "(none)"}`,
            "",
            `Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`,
          ].join("\n"),
          html: `
            <h2>New Quote Request</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${escapeHtml(name.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Contact</td><td style="padding:8px;">${escapeHtml(contact.trim())}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;">Services</td><td style="padding:8px;">${escapeHtml(servicesStr)}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Details</td><td style="padding:8px;">${escapeHtml(details?.trim() || "(none)")}</td></tr>
            </table>
          `,
        });
      } catch (emailErr) {
        // Log but don't fail the request — the quote is already saved
        console.error("Failed to send email notification:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Quote submission error:", err);
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
