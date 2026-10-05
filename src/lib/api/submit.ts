import type { SafeParseFailure } from "@/lib/api/error";
import { insertSubmission, markNotified } from "@/lib/db";
import { BODY_LIMIT_BYTES } from "@/lib/forms/limits";
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
  | { kind: "invalid"; values: Values; errors: Record<string, string>; failure: SafeParseFailure }
  /** The body could not be read, so there is nothing to validate or echo. */
  | { kind: "unreadable"; status: 400 | 413 };

/** A body that could not be read at all: malformed JSON, a form encoding
 *  that does not parse, or more than BODY_LIMIT_BYTES. It used to come
 *  back as null and fail the schema with "expected object, received
 *  null", which blamed the content for a problem with the request. 413
 *  when the request declared a length over the limit; a body that grew
 *  past it without declaring one is indistinguishable from any other
 *  broken stream here, and gets 400. */
export class Unreadable {
  constructor(readonly status: 400 | 413) {}
}

/**
 * The request body as the schema expects it. JSON for the enhanced path;
 * form-urlencoded or multipart for a plain HTML submit. A body that cannot
 * be read is an Unreadable, which the submit functions answer without
 * touching the schema.
 */
export async function readSubmission(
  request: Request,
  arrayFields: string[] = [],
): Promise<unknown> {
  const unreadable = () =>
    new Unreadable(Number(request.headers.get("content-length")) > BODY_LIMIT_BYTES ? 413 : 400);
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return await request.json().catch(unreadable);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return unreadable();
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

/** The form-level message a page shows for an unreadable no-JS submit.
 *  None of what was typed reached the server, so the only copy left is
 *  whatever the browser kept; "may" because whether Back restores a form
 *  is the browser's call, not this site's. */
export function unreadableMessage(status: 400 | 413): string {
  const back = "Your browser's Back button may still have what you typed.";
  return status === 413
    ? `That was more than this form can take, so none of it could be read. ${back} Please shorten it and send it again.`
    : `That submission could not be read. ${back} Please send it again.`;
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

/** Send the notification for row `id`, and record it once the relay has
 *  it. Logged and swallowed: the row is saved by the time mail is
 *  attempted, and a down relay must not turn a stored lead into a
 *  failure. A row left unrecorded is what /api/health counts. */
async function notify(id: number, send: () => Promise<boolean>) {
  try {
    if (await send()) markNotified(id);
  } catch (err) {
    console.error(`Submission #${id} is saved; notifying failed:`, err);
  }
}

/** Before validation and before the database: a trapped submission is
 *  answered like a real one, because an error teaches a bot what to
 *  change and a distinct success teaches it that it got through. The log
 *  line says which form and nothing about what was in it, so the trap's
 *  catch rate can be read from the journal without keeping the spam. */
function trapped(form: string, body: unknown): boolean {
  if (!isTrapped(body)) return false;
  console.log(`[honeypot] dropped a ${form} submission`);
  return true;
}

export async function submitQuote(body: unknown): Promise<Outcome> {
  if (body instanceof Unreadable) return { kind: "unreadable", status: body.status };
  if (trapped("quote", body)) return { kind: "dropped" };
  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) return invalid(body, parsed);

  const { name, contact, services, details } = parsed.data;
  const id = insertSubmission({
    name,
    contact,
    services: services.join(", "),
    details: details || null,
  });
  await notify(id, () => sendQuoteNotification(id, { name, contact, services, details }));
  return { kind: "saved" };
}

export async function submitPotsAudit(body: unknown): Promise<Outcome> {
  if (body instanceof Unreadable) return { kind: "unreadable", status: body.status };
  if (trapped("POTS audit", body)) return { kind: "dropped" };
  const parsed = PotsAuditRequest.safeParse(body);
  if (!parsed.success) return invalid(body, parsed);

  const { business, name, contact, bill, details } = parsed.data;
  // Both forms land in one table; `services` carries the literal marker
  // for an audit rather than a list, and is what tells the rows apart.
  const id = insertSubmission({
    name,
    contact,
    services: POTS_AUDIT_MARKER,
    details: [`Business: ${business}`, `Monthly bill: ${bill}`, details].filter(Boolean).join("\n"),
  });
  await notify(id, () => sendPotsAuditNotification(id, { business, name, contact, bill, details }));
  return { kind: "saved" };
}
