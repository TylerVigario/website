import nodemailer from "nodemailer";
import { renderPotsAuditEmail, renderQuoteEmail } from "@/emails/templates";

// Where submission notifications go. Derived, never hardcoded: a
// personal address compiled into source is one that ships to anyone who
// reads the repository, and it is deployment config rather than
// application behaviour — the same class as SMTP_HOST beside it.
//
// Defaults to the authenticated SMTP account, which is the sane
// self-notification target: mail sent through your own relay, back to
// you. NOTIFY_EMAIL overrides it when the recipient is not the sender —
// a role alias, or an inbox someone else watches.
//
// Deliberately not a required variable. Notifications are best-effort by
// design, gated on SMTP_USER + SMTP_PASS, and a submission is saved and
// answered whether or not any of this is set. Requiring it at boot
// would make a broken mail relay refuse to start a site whose forms
// work fine without one.
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || process.env.SMTP_USER || "";

// TWO WAYS TO BE CONFIGURED, because there are two kinds of relay.
//
// An authenticated relay (Gmail-style) needs SMTP_USER + SMTP_PASS. An
// internal relay does not — an MTA listening on loopback commonly takes
// local mail without credentials and forwards it upstream. Gating on
// USER+PASS alone made that shape unusable, so a deployment with a
// perfectly good relay could still have mail silently off, every
// submission logging "would send".
//
// Three states, not two. Configured is on; nothing set is deliberately
// off; exactly one of USER/PASS is a mistake that must not look like the
// second. A typo in a variable name leaves the transporter null and the
// send logging to stdout — indistinguishable from having chosen not to
// configure mail, which is why the misconfiguration is called out loudly.
// The envelope sender. An authenticated relay implies one — the account
// doing the authenticating — but an unauthenticated relay does not, and
// interpolating an unset SMTP_USER produced `<undefined>`, which is a
// malformed address every send would have failed on.
const MAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "";

const SMTP_USER_SET = Boolean(process.env.SMTP_USER);
const SMTP_PASS_SET = Boolean(process.env.SMTP_PASS);
const SMTP_AUTHED = SMTP_USER_SET && SMTP_PASS_SET;
const SMTP_HOST_SET = Boolean(process.env.SMTP_HOST);
const SMTP_CONFIGURED = SMTP_AUTHED || SMTP_HOST_SET;

if (SMTP_USER_SET !== SMTP_PASS_SET) {
  const set = SMTP_USER_SET ? "SMTP_USER" : "SMTP_PASS";
  const missing = SMTP_USER_SET ? "SMTP_PASS" : "SMTP_USER";
  console.error(
    `[Mailer] MISCONFIGURED: ${set} is set but ${missing} is not. If this relay ` +
      `needs authentication, notification email is OFF until ${missing} is set. ` +
      `Submissions are still saved and answered, but no one is told they arrived.`,
  );
}

// An unauthenticated relay has no account to fall back to, so the
// recipient must be stated. Without this the transporter would be built
// and every send would fail on an empty `to` — configured, and silently
// delivering nowhere, which is worse than off.
if (SMTP_CONFIGURED && (!NOTIFY_EMAIL || !MAIL_FROM)) {
  console.error(
    `[Mailer] MISCONFIGURED: a relay is configured but ${!NOTIFY_EMAIL ? "no recipient" : "no sender"} is. ` +
      "Set NOTIFY_EMAIL and SMTP_FROM — SMTP_USER is only a default for either when the " +
      "relay authenticates. Notification email is OFF.",
  );
}

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";

// A relay on this machine is reached over loopback, where there is no
// network for anyone to sit on and therefore nothing for certificate
// verification to protect against. A local MTA routinely presents a
// self-signed or long-stale certificate on loopback, which nodemailer
// correctly refuses — every send then fails while the submission saves
// fine and nobody is told.
//
// Relaxed for loopback ONLY, and by host rather than by a flag, so it
// cannot be switched on for a relay that actually crosses a network. A
// remote relay keeps full verification.
const LOOPBACK = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(SMTP_HOST);

const transporter =
  SMTP_CONFIGURED && NOTIFY_EMAIL && MAIL_FROM
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        ...(LOOPBACK ? { tls: { rejectUnauthorized: false } } : {}),
        // Omitted entirely rather than passed empty: nodemailer attempts
        // AUTH when the key is present, and a relay that offers no AUTH
        // rejects the attempt.
        ...(SMTP_AUTHED
          ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
          : {}),
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
// Not exported: the two notification helpers below are the whole
// public surface of this module, and an exported low-level sender
// invites a caller that bypasses them.
async function sendEmail(options: SendOptions): Promise<boolean> {
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
      from: `"VTS Website" <${MAIL_FROM}>`,
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
