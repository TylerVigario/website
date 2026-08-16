import nodemailer from "nodemailer";
import { renderPotsAuditEmail, renderQuoteEmail } from "@/emails/templates";

const NOTIFY_EMAIL = "tylervigario90@gmail.com";

// SMTP config gates on USER+PASS (Gmail-style auth) rather than HOST
// alone — the Gmail relay we use requires authentication. Vis-daily-
// tracker's mailer uses an unauthenticated internal relay (host-only
// gate); the shape is the same, the predicate is different.
const SMTP_CONFIGURED = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Low-level send. When SMTP isn't configured, logs the would-have-
 * been email to stdout instead — keeps dev flows usable without
 * setting up real credentials. Real send failures are logged to
 * with redacted recipient + subject context and re-thrown so callers
 * can decide whether to swallow (best-effort) or surface (critical).
 */
export async function sendEmail(options: SendOptions): Promise<boolean> {
  if (!transporter) {
    console.log(`[Mailer] SMTP not configured — would send:`);
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(
      `  Body:\n${options.text
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")}`,
    );
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: `"VTS Website" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[Mailer] Sent email to ${options.to}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(err, {
      tags: { area: "email" },
      extra: { to: options.to, subject: options.subject },
    });
    throw err;
  }
}

/**
 * "Pacific Time" formatter used for the submittedAt subtitle in every
 * notification email. Centralized so the two templates render identical
 * timestamps for submissions that land within the same minute.
 */
function formatSubmittedAt(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export interface SendQuoteNotificationArgs {
  name: string;
  contact: string;
  services: string[];
  details?: string;
}

/**
 * Render + send the "new quote request" internal notification.
 * Throws on SMTP failure; the route handler wraps in try/catch so the
 * SQLite row is preserved either way (the email is best-effort).
 */
export async function sendQuoteNotification(args: SendQuoteNotificationArgs): Promise<void> {
  const submittedAtFormatted = formatSubmittedAt();
  const html = renderQuoteEmail({ ...args, submittedAtFormatted });

  const servicesStr = args.services.join(", ") || "(none selected)";
  const text = [
    `Name: ${args.name}`,
    `Contact: ${args.contact}`,
    `Services: ${servicesStr}`,
    `Details: ${args.details || "(none)"}`,
    "",
    `Submitted: ${submittedAtFormatted}`,
  ].join("\n");

  await sendEmail({
    to: NOTIFY_EMAIL,
    subject: `New Quote Request from ${args.name}`,
    text,
    html,
  });
}

export interface SendPotsAuditNotificationArgs {
  business: string;
  name: string;
  contact: string;
  bill: string;
  details?: string;
}

/**
 * Render + send the "POTS audit request" internal notification.
 * Throws on SMTP failure; same best-effort semantics as the quote
 * notification.
 */
export async function sendPotsAuditNotification(
  args: SendPotsAuditNotificationArgs,
): Promise<void> {
  const submittedAtFormatted = formatSubmittedAt();
  const html = renderPotsAuditEmail({ ...args, submittedAtFormatted });

  const text = [
    `Business: ${args.business}`,
    `Name: ${args.name}`,
    `Contact: ${args.contact}`,
    `Monthly bill: ${args.bill}`,
    `Details: ${args.details || "(none)"}`,
    "",
    `Submitted: ${submittedAtFormatted}`,
    `Source: /pots-migration landing page`,
  ].join("\n");

  await sendEmail({
    to: NOTIFY_EMAIL,
    subject: `POTS Audit Request from ${args.business}`,
    text,
    html,
  });
}
