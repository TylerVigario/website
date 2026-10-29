/**
 * How long a form was open before it was sent.
 *
 * The spam that gets past the honeypot comes from scripts that load the
 * page and post the form straight back. Of the 22 that reached a form
 * between 15 and 29 October 2026, 18 posted within two seconds of loading
 * it, and so did both ads that were stored. No person enters a name and a
 * phone number or email and picks a service that fast. So the form
 * carries the time the server rendered it, and a submission sent less
 * than MIN_FILL_MS after that is refused.
 *
 * Refused, not dropped the way the honeypot drops what it catches. A
 * person can be that fast too: a draft restored on reload, or autofill,
 * and then Send. A silent drop would tell them it went through and throw
 * it away. The refusal says what happened, keeps everything they entered,
 * and sending again a moment later goes through. None of the scripts has
 * sent again in the same visit, so a refusal stops them as surely as a
 * drop would.
 *
 * Unsigned. It stops a script that posts back what the page gave it,
 * which is all that has arrived; one written for this site could backdate
 * it. A submission with no stamp, or one that does not read as one, is
 * let through: a page served before the stamp existed has none.
 *
 * The stamp is the server's clock at render, so it only means anything on
 * a page rendered per request. Prerendered, every form would carry the
 * build's time and nothing would ever be too soon.
 */
export const SERVED_FIELD = "served";

/** Three seconds. The access log counts whole seconds, and every fast
 *  post was at most two of them after its page, so under three. */
export const MIN_FILL_MS = 3000;

/** The form-level message for a refused submission, on both ways in. */
export const TOO_SOON_MESSAGE =
  "That came in within seconds of the form opening, the way spam does, so it wasn't accepted. Everything you entered is still here — please send it again.";

/** A stamp as this server writes one: milliseconds since the epoch. */
function read(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const ms = Number(value);
  return Number.isSafeInteger(ms) ? ms : null;
}

/**
 * The stamp a form renders with. A form re-rendered after a failed send
 * keeps the stamp it was sent with, so the time counts from when it was
 * first served and sending again after fixing one field is not refused.
 * Anything else is stamped now, including a stamp from the future, which
 * this server did not write.
 */
export function servedStamp(values: Record<string, string | string[]>, now = Date.now()): string {
  const sent = read(values[SERVED_FIELD]);
  return sent !== null && sent <= now ? String(sent) : String(now);
}

/**
 * How many milliseconds after its form was served a submission was sent,
 * when that is too soon to be a person; null otherwise. A stamp from the
 * future counts as too soon: a script that wrote one gets no further than
 * one that sent the form straight back.
 */
export function tooSoon(body: unknown, now = Date.now()): number | null {
  if (!body || typeof body !== "object") return null;
  const served = read((body as Record<string, unknown>)[SERVED_FIELD]);
  if (served === null) return null;
  const elapsed = now - served;
  return elapsed < MIN_FILL_MS ? elapsed : null;
}
