import { createHmac, timingSafeEqual } from "node:crypto";

/*
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
 * The stamp is the time and a signature over it, made with a key only the
 * server holds (src/lib/db.ts). A client can read it and can change it,
 * and a changed one no longer verifies, so the time cannot be backdated
 * nor a stamp made up. What a submission proves, then, is that this
 * server served a form at least MIN_FILL_MS before it.
 *
 * That is all a stamp can prove. It does not say who was given the form
 * or who filled it in, so it is not spent and does not expire. A page
 * restored from memory, or left open for a month, sends with the stamp it
 * has, however many times it is sent. Holding a stamp to one use or to a
 * lifetime would refuse those people and stop no script, since a script
 * that waits gets a new stamp with every page load. What a script that
 * waits meets is the proxy's per-address limit and the notification cap
 * (src/lib/email/cap.ts).
 *
 * A stamp that is missing or does not verify is refused as stale, with
 * everything entered kept. A person meets that only on a page served
 * before an update changed the stamp, or while its key could not be read
 * (src/lib/api/form-stamp.ts). The stamp is the server's clock at render,
 * so it only means anything on a page rendered per request. Prerendered,
 * every form would carry the build's time.
 */

/** The hidden field each form carries its stamp in. */
export const SERVED_FIELD = "served";

/** Three seconds. The access log counts whole seconds, and every fast
 *  post was at most two of them after its page, so under three. */
export const MIN_FILL_MS = 3000;

/** Why a stamp refused a submission. */
export type Refusal = "too-soon" | "stale";

/** The form-level message for a submission sent too soon, on both ways in. */
const TOO_SOON_MESSAGE =
  "That came in within seconds of the form opening, the way spam does, so it wasn't accepted. Everything you entered is still here — please send it again.";

/** Why a stale one was not accepted, which both ways in say first. */
const STALE_MESSAGE =
  "This page was loaded before the site was updated, so its form couldn't be checked and wasn't accepted.";

/** What the page says, re-rendering the form with a stamp that works:
 *  the one it was sent with when that was only early, a new one otherwise. */
export const PAGE_MESSAGE: Record<Refusal, string> = {
  "too-soon": TOO_SOON_MESSAGE,
  stale: `${STALE_MESSAGE} Everything you entered is still here — please send it again.`,
};

/** What the API says. The enhanced form stays on its page, and with it
 *  the page's stamp, so a stale one needs the page reloaded; the draft
 *  (src/lib/forms/enhance.ts) brings back what was typed. */
export const API_MESSAGE: Record<Refusal, string> = {
  "too-soon": TOO_SOON_MESSAGE,
  stale: `${STALE_MESSAGE} Reload the page and send it again — what you typed will still be there.`,
};

const SHAPE = /^(\d{1,16})\.([A-Za-z0-9_-]{43})$/;

function sign(time: string, key: Buffer): string {
  return createHmac("sha256", key).update(time).digest("base64url");
}

/** A new stamp, served at `now`. */
export function issueStamp(key: Buffer, now = Date.now()): string {
  const time = String(now);
  return `${time}.${sign(time, key)}`;
}

/** What a submitted stamp says about its submission. `why` is for the
 *  log line. */
export type StampCheck =
  { kind: "ok" } | { kind: "too-soon"; elapsed: number } | { kind: "stale"; why: string };

/**
 * Checks a submitted stamp: issued by this server, and served at least
 * MIN_FILL_MS ago. A stamp from the future counts as too soon: this
 * server's clock went back, and a person sending again a moment later
 * gets through.
 */
export function checkStamp(value: unknown, key: Buffer, now = Date.now()): StampCheck {
  if (value === undefined || value === "") return { kind: "stale", why: "with no stamp" };
  const [, time, mac] = (typeof value === "string" ? SHAPE.exec(value) : null) ?? [];
  if (!time || !mac) return { kind: "stale", why: "with a stamp that does not verify" };
  // Compared as the text it was issued as, not decoded: base64url's last
  // character carries padding bits, so two spellings decode alike, and
  // only the one this server wrote is its.
  const expected = Buffer.from(sign(time, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { kind: "stale", why: "with a stamp that does not verify" };
  }
  const elapsed = now - Number(time);
  return elapsed < MIN_FILL_MS ? { kind: "too-soon", elapsed } : { kind: "ok" };
}

/**
 * The stamp a form renders with. A form re-rendered after a failed send
 * keeps the stamp it was sent with if that verifies and is not from the
 * future, so the time counts from when it was first served and sending
 * again after fixing one field is not refused. Anything else gets a new
 * one.
 */
export function keepOrIssue(
  values: Record<string, string | string[]>,
  key: Buffer,
  now = Date.now(),
): string {
  const sent = values[SERVED_FIELD];
  const check = checkStamp(sent, key, now);
  const keep =
    typeof sent === "string" &&
    (check.kind === "ok" || (check.kind === "too-soon" && check.elapsed >= 0));
  return keep ? sent : issueStamp(key, now);
}
