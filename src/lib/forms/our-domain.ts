/**
 * An address at the site's own domain, which no one sending a form has.
 *
 * Ad senders give a made-up name at the site's own domain as the address
 * to reach them: the two most recent of the five ads stored between 25
 * October and 18 November 2026 did. No spam list will ever name this
 * domain, so a lookup (spam-list.ts) cannot catch one. Only the
 * business's own people hold an address here, and none of them asks the
 * site for a quote.
 *
 * So the contact field refuses one, where a listed sender is only
 * flagged. A listed address can be a real person's, refused on someone
 * else's record without a word. This one is never the visitor's, and the
 * refusal is a message beside the field: a person who typed it by mistake
 * is told, and keeps everything else they typed. The field already asks
 * for the visitor's own way to be reached ("whichever you'd rather we
 * use"), so no new constraint is being failed unannounced.
 *
 * The schemas and the browser's rules both use this, so they cannot
 * disagree about what is ours. A subdomain is ours too. The domain is
 * the one SITE names, so a move to another moves this with it.
 */
import { SITE } from "@/lib/site";

const OURS = new URL(SITE).hostname;

/** What the contact field says when given one. */
export const OUR_DOMAIN_MESSAGE = "That's one of our addresses. Please give us yours.";

/** Whether any address in `contact` is at the site's domain or below it. */
export function atOurDomain(contact: string): boolean {
  for (const [, host = ""] of contact.toLowerCase().matchAll(/@([a-z0-9.-]+)/g)) {
    const domain = host.replace(/\.+$/, ""); // a sentence's full stop, or a root's dot
    if (domain === OURS || domain.endsWith(`.${OURS}`)) return true;
  }
  return false;
}
