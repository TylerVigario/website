import { lookup } from "node:dns/promises";
import nodemailer from "nodemailer";
import { renderPotsAuditEmail, renderQuoteEmail } from "@/emails/templates";
import {
  describeRelay,
  readRelay,
  transportOptions,
  unverifiedPeerWarning,
} from "@/lib/email/relay";

// Where submission notifications go. Derived, never hardcoded: a
// personal address compiled into source is one that ships to anyone who
// reads the repository, and it is deployment config rather than
// application behaviour — the same class as SMTP_HOST beside it.
//
// Defaults to the authenticated SMTP account, which is the sane
// self-notification target: mail sent through your own relay, back to
// you. NOTIFY_EMAIL overrides it when the recipient is not the sender —
// a role alias, or an inbox someone else watches.
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || process.env.SMTP_USER || "";

// The envelope sender. An authenticated relay implies one — the account
// doing the authenticating — but an unauthenticated relay does not, and
// interpolating an unset SMTP_USER produced `<undefined>`, which is a
// malformed address every send would have failed on.
const MAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "";

// THREE STATES, NOT TWO. Nothing set is mail deliberately off, and every
// send logs what it would have sent. Anything set is an intent to send,
// and it is either acted on exactly as written or reported as
// MISCONFIGURED — off, loudly. What must never happen is a mistake that
// looks like the first state: a typo in a variable name, or half a pair
// of credentials, silently sending nothing or sending in a way the
// operator did not configure.
//
// Notifications are best-effort by design. A submission is saved and
// answered in every one of these states; a broken relay must not refuse
// to start a site whose forms work fine without one.
//
// Two kinds of relay, both first-class. An authenticated relay needs
// SMTP_USER + SMTP_PASS; an internal one — an MTA on this machine or on
// the LAN — commonly takes mail without credentials and needs only
// SMTP_HOST. How either is reached is the operator's call: see relay.ts.
const SMTP_INTENDED = Boolean(
  process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASS,
);

const reading = SMTP_INTENDED ? readRelay(process.env) : { relay: null, problems: [] };
const problems = [...reading.problems];
if (SMTP_INTENDED && !NOTIFY_EMAIL) problems.push("no recipient: set NOTIFY_EMAIL");
if (SMTP_INTENDED && !MAIL_FROM) problems.push("no sender: set SMTP_FROM");
const relay = problems.length ? null : reading.relay;

if (problems.length) {
  console.error(
    `[Mailer] MISCONFIGURED, notification email is OFF: ${problems.join("; ")}. ` +
      "Submissions are still saved and answered, but no one is told they arrived.",
  );
} else if (relay) {
  console.log(`[Mailer] Relay ${describeRelay(relay)}.`);
  // A warning at most, and only when there is something to say. An
  // unauthenticated peer on the operator's own network is their call
  // and gets no comment; the same choice pointed across the internet is
  // still their call, and is named once so it is a decision rather than
  // an accident. Resolved here because SMTP_HOST is usually a name.
  if (relay.tls === "none" || !relay.verify) {
    void lookup(relay.host, { all: true }).then(
      (found) => {
        const warning = unverifiedPeerWarning(
          relay,
          found.map((a) => a.address),
        );
        if (warning) console.warn(warning);
      },
      (err: NodeJS.ErrnoException) => {
        console.warn(
          `[Mailer] WARNING: could not resolve ${relay.host} (${err.code ?? err.message}) ` +
            "to tell whether it is on a local network.",
        );
      },
    );
  }
}

const transporter = relay ? nodemailer.createTransport(transportOptions(relay)) : null;

interface SendOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Low-level send. When SMTP isn't configured, logs the would-have-
 * been email to stdout instead — keeps dev flows usable without
 * setting up real credentials. A real send failure is logged with its
 * recipient and subject, then re-thrown so the caller decides whether
 * to swallow it (best-effort) or surface it.
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
    // The recipient is the operator's own address. The subject carries
    // the submitter's name, and that is what makes the line useful: it
    // says which lead went unannounced. The row itself is already saved.
    console.error(`[Mailer] Send to ${options.to} failed (${options.subject}):`, err);
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
