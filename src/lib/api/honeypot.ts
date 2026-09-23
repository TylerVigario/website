/**
 * A field no person fills in.
 *
 * Three of the four submissions this site has ever received were bots
 * selling backpacks and posture correctors. They fill every input they
 * find, which is the whole tell: a field hidden from people and left
 * empty by them is filled by anything crawling the DOM.
 *
 * It is not a CAPTCHA and does not pretend to be. It stops the
 * undirected form-spam that actually arrives here, costs no request, no
 * JavaScript and no third party, and asks the visitor for nothing.
 */
export const HONEYPOT_FIELD = "website";

/**
 * True when a submission should be dropped.
 *
 * Accepts the raw parsed body rather than a validated object, because
 * this runs BEFORE validation — a bot's payload frequently fails the
 * schema too, and a rejected-by-zod response tells it which fields to
 * fix. Dropping first means it learns nothing either way.
 */
export function isTrapped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}
