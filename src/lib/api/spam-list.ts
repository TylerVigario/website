import { readFileSync, statSync } from "node:fs";
import { isIP } from "node:net";
import path from "node:path";

/**
 * Known spam senders, looked up on this machine.
 *
 * What gets past the honeypot and the fill-time floor is advertising,
 * sent by services whose addresses are already on public spam lists. Of
 * the seven sources that posted to /contact between 25 and 30 October
 * 2026, StopForumSpam listed six by IP, and it listed the contact email
 * of every ad that was stored. So the host downloads its lists into
 * SPAM_LISTS_DIR, and a submission is looked up there: nothing about
 * anyone who sends a form leaves the server.
 *
 * A match flags a submission and never refuses it. A listed IP can be a
 * shared or recycled address with a real person behind it, and a lead
 * refused on someone else's record is lost with no one the wiser. So the
 * row is stored like any other, and the notification says it matched,
 * where a mail filter can sort it.
 *
 * Each file holds one entry per line, as the host writes them. A file is
 * reread when its modification time changes, and that time is its age:
 * the host refreshes the lists daily, and /api/health reports one it has
 * stopped refreshing.
 */

/** What can match, and the file in SPAM_LISTS_DIR that lists it. */
export const LISTS = { email: "emails.txt", "IP address": "ips.txt" } as const;
export type Listing = keyof typeof LISTS;

/** Older than this, a list is reported stale. The host refreshes daily,
 *  so three days is two missed refreshes, not one slow one. */
export const STALE_AFTER_DAYS = 3;

/** Where the notification's subject says a submission matched, so a mail
 *  filter can sort on it. */
export const LISTED_TAG = "[Listed]";

/** An address as the lists and the proxy might each write it, in one
 *  form: IPv4 as is, IPv6 compressed and lower-case, and an IPv4 address
 *  mapped into IPv6 as the IPv4 address it is. Anything else is no
 *  address at all. */
export function canonicalIp(raw: string): string | undefined {
  const ip = raw.trim();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (mapped !== undefined) return isIP(mapped) === 4 ? mapped : undefined;
  if (isIP(ip) === 4) return ip;
  if (isIP(ip) !== 6) return undefined;
  // The URL parser writes an IPv6 host in its one canonical form.
  return new URL(`http://[${ip}]/`).hostname.slice(1, -1);
}

const normalise: Record<Listing, (entry: string) => string | undefined> = {
  email: (entry) => entry.trim().toLowerCase() || undefined,
  "IP address": canonicalIp,
};

const loaded = new Map<string, { mtimeMs: number; entries: Set<string> }>();

/** The entries of one list, reread only when the file has changed. */
function entries(listing: Listing, dir: string): Set<string> {
  const file = path.join(dir, LISTS[listing]);
  const { mtimeMs } = statSync(file);
  const cached = loaded.get(file);
  if (cached?.mtimeMs === mtimeMs) return cached.entries;
  const set = new Set<string>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const entry = normalise[listing](line);
    if (entry !== undefined) set.add(entry);
  }
  loaded.set(file, { mtimeMs, entries: set });
  return set;
}

/**
 * Which of a submission's contact email and IP address are listed. Empty
 * when they are not, when the contact is a phone number, or when no lists
 * are configured.
 *
 * A list that cannot be read counts as listing nothing. That costs one
 * flag; throwing would cost the notification, whose sender this runs
 * inside. The failure is logged, and /api/health reports the list.
 */
export function listed(contact: string, ip: string | undefined): Listing[] {
  const dir = process.env.SPAM_LISTS_DIR;
  if (!dir) return [];
  const sent: Record<Listing, string | undefined> = {
    email: contact.includes("@") ? normalise.email(contact) : undefined,
    "IP address": ip === undefined ? undefined : canonicalIp(ip),
  };
  return (Object.keys(LISTS) as Listing[]).filter((listing) => {
    const value = sent[listing];
    if (value === undefined) return false;
    try {
      return entries(listing, dir).has(value);
    } catch (err) {
      console.warn(`[spam-list] ${LISTS[listing]} unreadable, so not checked:`, err);
      return false;
    }
  });
}

/** The line a notification carries for a match. */
export function describeListing(found: Listing[]): string {
  return `Its ${found.join(" and ")} ${found.length > 1 ? "are" : "is"} on a list of known spam senders.`;
}

/** What is wrong with the lists, or undefined when they are fresh or
 *  deliberately absent. Unset is a choice, so it is not a problem. */
export function listsProblem(now = Date.now()): string | undefined {
  const dir = process.env.SPAM_LISTS_DIR;
  if (!dir) return undefined;
  for (const file of Object.values(LISTS)) {
    let mtimeMs: number;
    try {
      ({ mtimeMs } = statSync(path.join(dir, file)));
    } catch {
      return `${file} is missing from SPAM_LISTS_DIR`;
    }
    const days = (now - mtimeMs) / 86_400_000;
    if (days > STALE_AFTER_DAYS) {
      return `${file} was last refreshed ${days.toFixed(1)} days ago, over ${STALE_AFTER_DAYS}`;
    }
  }
  return undefined;
}
