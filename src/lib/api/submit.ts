import type { SafeParseFailure } from "@/lib/api/error";
import { insertSubmission } from "@/lib/db";
import { QuoteRequest } from "@/lib/api/quote";
import { POTS_AUDIT_MARKER, PotsAuditRequest } from "@/lib/api/pots-audit";
import { isTrapped } from "@/lib/api/honeypot";
import { sendPotsAuditNotification, sendQuoteNotification } from "@/lib/email/mailer";

/**
 * One submission path, shared by both ways in.
 *
 * With JavaScript, the form posts JSON to /api/quote or /api/pots-audit
 * and gets JSON back. Without it, the form posts to its own page, which
 * re-renders with the errors — nothing typed ever travels in a URL, where
 * it would land in browser history and access logs and could outgrow a
 * request line. Both routes call these functions, so they cannot disagree
 * about what is trapped, what is valid or what is stored.
 */

export type Values = Record<string, string | string[]>;

export type Outcome =
  | { kind: "saved" }
  /** Caught by the honeypot. Answered exactly like "saved", never stored. */
  | { kind: "dropped" }
  | { kind: "invalid"; values: Values; errors: Record<string, string>; failure: SafeParseFailure };

/**
 * The request body as the schema expects it. JSON for the enhanced path;
 * form-urlencoded or multipart for a plain HTML submit. Anything
 * unreadable (malformed JSON, a body over the adapter's size limit) is
 * null, which the schema then rejects as a normal validation failure.
 */
export async function readSubmission(
  request: Request,
  arrayFields: string[] = [],
): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return await request.json().catch(() => null);

  const form = await request.formData().catch(() => null);
  if (!form) return null;
  const out: Values = {};
  for (const key of new Set(form.keys())) {
    // A File stringifies to "[object File]"; these forms upload nothing,
    // so a non-string entry is not ours to read.
    const all = form.getAll(key).filter((v): v is string => typeof v === "string");
    // A checkbox group stays an array even with one box ticked, or the
    // schema would see a string.
    out[key] = arrayFields.includes(key) ? all : (all[0] ?? "");
  }
  for (const key of arrayFields) if (!(key in out)) out[key] = [];
  return out;
}

/** What was submitted, reduced to strings, for echoing back into the form. */
function echo(body: unknown): Values {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const out: Values = {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
  }
  return out;
}

function invalid(body: unknown, failure: SafeParseFailure): Outcome {
  const errors: Record<string, string> = {};
  // First message per field, matching how the form shows one per field.
  for (const i of failure.error.issues) errors[String(i.path[0] ?? "(root)")] ??= i.message;
  return { kind: "invalid", values: echo(body), errors, failure };
}

/** Log and swallow: the row is saved by the time mail is attempted, and a
 *  down relay must not turn a stored lead into a failure. */
async function notify(send: () => Promise<void>) {
  try {
    await send();
  } catch (err) {
    console.error("Failed to send email notification:", err);
  }
}

export async function submitQuote(body: unknown): Promise<Outcome> {
  // Before validation and before the database: a trapped submission is
  // answered like a real one, because an error teaches a bot what to
  // change and a distinct success teaches it that it got through.
  if (isTrapped(body)) return { kind: "dropped" };
  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) return invalid(body, parsed);

  const { name, contact, services, details } = parsed.data;
  insertSubmission({ name, contact, services: services.join(", "), details: details || null });
  await notify(() => sendQuoteNotification({ name, contact, services, details }));
  return { kind: "saved" };
}

export async function submitPotsAudit(body: unknown): Promise<Outcome> {
  if (isTrapped(body)) return { kind: "dropped" };
  const parsed = PotsAuditRequest.safeParse(body);
  if (!parsed.success) return invalid(body, parsed);

  const { business, name, contact, bill, details } = parsed.data;
  // Both forms land in one table; `services` carries the literal marker
  // for an audit rather than a list, and is what tells the rows apart.
  insertSubmission({
    name,
    contact,
    services: POTS_AUDIT_MARKER,
    details: [`Business: ${business}`, `Monthly bill: ${bill}`, details].filter(Boolean).join("\n"),
  });
  await notify(() => sendPotsAuditNotification({ business, name, contact, bill, details }));
  return { kind: "saved" };
}
