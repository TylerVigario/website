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

/** Which of the three states above the mailer is in. /api/health reports
 *  it, so a mistake in the relay settings shows up somewhere other than a
 *  boot line nobody reads. */
export type MailState = "on" | "off" | "misconfigured";
export const mailState: MailState = problems.length ? "misconfigured" : relay ? "on" : "off";

interface SendOptions {
  /** The submission's row id: in the subject, and the only thing logged
   *  about it when mail is off in production. */
  id: number;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/** A contact that is exactly one email address, or undefined. A reply to
 *  the notification then goes to the person who asked, not to the site's
 *  own sender. Anything else (a phone number, two addresses, text around
 *  an address) sets nothing: Reply-To is only ever a clean address. */
function replyAddress(contact: string): string | undefined {
  const c = contact.trim();
  return /^[^\s@<>,;:"()[\]\\]+@[^\s@<>,;:"()[\]\\]+\.[^\s@<>,;:"()[\]\\]+$/.test(c)
    ? c
    : undefined;
}

/**
 * Low-level send. Returns true once the message is handed to the relay,
 * false when mail is off or misconfigured. A real send failure is logged
 * with its recipient and subject, then re-thrown so the caller decides
 * whether to swallow it (best-effort) or surface it.
 *
 * With mail off, development logs the whole would-be email so the forms
 * can be worked on without a relay. Production logs the row id and
 * nothing else: the row is already in the database, and a second copy of
 * someone's name, number and message in the journal is one kept outside
 * every retention rule.
 */
// Not exported: the two notification helpers below are the whole
// public surface of this module, and an exported low-level sender
// invites a caller that bypasses them.
async function sendEmail(options: SendOptions): Promise<boolean> {
  if (!transporter) {
    if (import.meta.env.PROD) {
      console.log(`[Mailer] Mail is ${mailState}: submission #${options.id} saved, not announced.`);
      return false;
    }
    console.log(`[Mailer] Mail is ${mailState} — would send:`);
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    if (options.replyTo) console.log(`  Reply-To: ${options.replyTo}`);
    console.log(
      `  Body:\n${options.text
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")}`,
    );
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"VTS Website" <${MAIL_FROM}>`,
      to: options.to,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[Mailer] Sent submission #${options.id} to ${options.to}: ${info.messageId}`);
    return true;
  } catch (err) {
    // The recipient is the operator's own address. The row id says which
    // lead went unannounced, and is all the line needs: the row itself is
    // saved, with the name and number in it, and the journal is no place
    // for a second copy.
    console.error(`[Mailer] Send of submission #${options.id} to ${options.to} failed:`, err);
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
 * Render + send the "new quote request" internal notification for row
 * `id`. Resolves true once the relay has it, false with mail off. Throws
 * on SMTP failure; submit.ts catches that, so the row it already saved is
 * kept either way (the email is best-effort).
 */
export async function sendQuoteNotification(
  id: number,
  args: SendQuoteNotificationArgs,
): Promise<boolean> {
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

  return sendEmail({
    id,
    to: NOTIFY_EMAIL,
    subject: `New Quote Request #${id} from ${args.name}`,
    replyTo: replyAddress(args.contact),
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
 * Render + send the "POTS audit request" internal notification for row
 * `id`. Same results and best-effort semantics as the quote notification.
 */
export async function sendPotsAuditNotification(
  id: number,
  args: SendPotsAuditNotificationArgs,
): Promise<boolean> {
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

  return sendEmail({
    id,
    to: NOTIFY_EMAIL,
    subject: `POTS Audit Request #${id} from ${args.business}`,
    replyTo: replyAddress(args.contact),
    text,
    html,
  });
}
