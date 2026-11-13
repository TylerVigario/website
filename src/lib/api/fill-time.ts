import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DRAFT_DAYS } from "../retention.ts";

/**
 * How long a form was open before it was sent, as the server itself
 * recorded it.
 *
 * The spam that gets past the honeypot comes from scripts that load the
 * page and post the form straight back. Of the 22 that reached a form
 * between 15 and 29 October 2026, 18 posted within two seconds of loading
 * it, and so did both ads that were stored. No person enters a name and a
 * phone number or email and picks a service that fast. So the form
 * carries a stamp of when the server rendered it, and a submission sent
 * less than MIN_FILL_MS after that is refused.
 *
 * Refused, not dropped the way the honeypot drops what it catches. A
 * person can be that fast too: a draft restored on reload, or autofill,
 * and then Send. A silent drop would tell them it went through and throw
 * it away. The refusal says what happened, keeps everything they entered,
 * and sending again a moment later goes through.
 *
 * The stamp is the time, a random value, and a signature over both and
 * the form's name, made with a key only the server holds (src/lib/db.ts).
 * A client can read it and can change it, and a changed one no longer
 * verifies: the time cannot be backdated, nor a stamp made up, nor one
 * from one form used on the other. And each is spent once: a saved
 * submission records its stamp's random value, which the table holds
 * unique, so loading the page once does not buy a thousand posts. What a
 * submission proves, then, is that this server served its form at least
 * MIN_FILL_MS before, and that nothing has been saved from that form
 * since. A script that loads the page and waits gets one submission per
 * page load; past that it meets the proxy's per-address limit and the
 * notification cap (src/lib/email/cap.ts).
 *
 * A stamp that is missing, does not verify, or is older than MAX_AGE_MS
 * is refused as stale, and one already spent as spent, each with
 * everything entered kept. The stamp is the server's clock at render, so
 * it only means anything on a page rendered per request. Prerendered,
 * every form would carry the build's time.
 */
export const SERVED_FIELD = "served";

/** Three seconds. The access log counts whole seconds, and every fast
 *  post was at most two of them after its page, so under three. */
export const MIN_FILL_MS = 3000;

/** As long as a draft is kept (src/lib/retention.ts): a form left open
 *  longer than that is a stale page, not a person still typing. */
export const MAX_AGE_MS = DRAFT_DAYS * 24 * 60 * 60 * 1000;

/** The form a stamp was issued for. Part of what is signed. */
export type FormName = "quote" | "pots-audit";

/** Why a stamp refused a submission. */
export type Refusal = "too-soon" | "stale" | "spent";

/** The form-level message for a submission sent too soon, on both ways in. */
export const TOO_SOON_MESSAGE =
  "That came in within seconds of the form opening, the way spam does, so it wasn't accepted. Everything you entered is still here — please send it again.";

/** What the page says, re-rendering the form with a stamp that works:
 *  the one it was sent with when that was only early, a new one otherwise. */
export const PAGE_MESSAGE: Record<Refusal, string> = {
  "too-soon": TOO_SOON_MESSAGE,
  stale:
    "This form had expired, so it wasn't accepted. Everything you entered is still here — please send it again.",
  spent:
    "This form was already sent, and it arrived. Everything you entered is still here, if you meant to send it again.",
};

/** What the API says. The enhanced form stays on its page, and with it
 *  the page's stamp, so a stale or spent one needs the page reloaded; the
 *  draft (src/lib/forms/enhance.ts) brings back what was typed. */
export const API_MESSAGE: Record<Refusal, string> = {
  "too-soon": TOO_SOON_MESSAGE,
  stale:
    "This form had expired, so it wasn't accepted. Reload the page and send it again — what you typed will still be there.",
  spent: "This form was already sent, and it arrived. To send another, reload the page.",
};

const SHAPE = /^(\d{1,16})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;

function sign(form: FormName, time: string, nonce: string, key: Buffer): Buffer {
  return createHmac("sha256", key).update(`${form}\n${time}\n${nonce}`).digest();
}

/** A new stamp for `form`, served at `now`. */
export function issueStamp(form: FormName, key: Buffer, now = Date.now()): string {
  const time = String(now);
  const nonce = randomBytes(16).toString("base64url");
  return `${time}.${nonce}.${sign(form, time, nonce, key).toString("base64url")}`;
}

/** What a submitted stamp says about its submission. `nonce` is what a
 *  saved submission records, to spend it; `why` is for the log line. */
export type StampCheck =
  | { kind: "ok"; nonce: string }
  | { kind: "too-soon"; elapsed: number }
  | { kind: "stale"; why: string };

/**
 * Checks a submitted stamp: issued by this server for this form, served
 * at least MIN_FILL_MS and at most MAX_AGE_MS ago. Whether it is already
 * spent is the insert's to say. A stamp from the future counts as too
 * soon: this server's clock went back, and a person sending again a
 * moment later gets through.
 */
export function checkStamp(
  form: FormName,
  value: unknown,
  key: Buffer,
  now = Date.now(),
): StampCheck {
  if (value === undefined || value === "") return { kind: "stale", why: "with no stamp" };
  const parts = typeof value === "string" ? SHAPE.exec(value) : null;
  const [, time, nonce, mac] = parts ?? [];
  if (!time || !nonce || !mac) return { kind: "stale", why: "with a stamp that does not verify" };
  // Compared as the text it was issued as, not decoded: base64url's last
  // character carries padding bits, so two spellings decode alike, and
  // only the one this server wrote is its.
  const expected = Buffer.from(sign(form, time, nonce, key).toString("base64url"));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { kind: "stale", why: "with a stamp that does not verify" };
  }
  const elapsed = now - Number(time);
  if (elapsed < MIN_FILL_MS) return { kind: "too-soon", elapsed };
  if (elapsed > MAX_AGE_MS)
    return { kind: "stale", why: "with a stamp older than its form's limit" };
  return { kind: "ok", nonce };
}

/**
 * The stamp a form renders with. A form re-rendered after a failed send
 * keeps the stamp it was sent with if that still verifies and is not from
 * the future, so the time counts from when it was first served and
 * sending again after fixing one field is not refused. Anything else
 * gets a new one. submit.ts drops a stale or spent stamp from what it
 * hands back, so those are replaced too.
 */
export function keepOrIssue(
  form: FormName,
  values: Record<string, string | string[]>,
  key: Buffer,
  now = Date.now(),
): string {
  const sent = values[SERVED_FIELD];
  const check = checkStamp(form, sent, key, now);
  const keep =
    typeof sent === "string" &&
    (check.kind === "ok" || (check.kind === "too-soon" && check.elapsed >= 0));
  return keep ? sent : issueStamp(form, key, now);
}
