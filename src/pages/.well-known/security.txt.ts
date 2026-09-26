import type { APIRoute } from "astro";

/**
 * RFC 9116 security.txt.
 *
 * SECURITY.md has said how to report a vulnerability for a long time;
 * it just was not at the URI anyone checks. A researcher looks here
 * first, and finding nothing they either guess an address or give up —
 * and the failure mode of giving up is a finding that goes public
 * instead of coming here.
 *
 * Generated rather than dropped in public/ so the two required fields
 * cannot rot. `Canonical` is built from `site`, so the domain move that
 * happened once already cannot leave this pointing at the old host, and
 * `Expires` is computed per build rather than typed.
 *
 * ON EXPIRES. RFC 9116 makes it mandatory and says a consumer should
 * not trust an expired file — the point being that a stale contact is
 * worse than none. A year from build means every release refreshes it,
 * and a site that has not shipped in a year has a security contact
 * nobody has checked, which is exactly what the field exists to
 * disclose.
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL("https://vigario.tech")).origin;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const body = [
    "# Reporting a vulnerability in this site or its source.",
    "# Please do not open a public issue before it is fixed.",
    "",
    "Contact: https://github.com/TylerVigario/website/security/advisories/new",
    "Contact: mailto:security@vigario.tech",
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${origin}/.well-known/security.txt`,
    "Policy: https://github.com/TylerVigario/website/blob/main/SECURITY.md",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      // Sent only where Node serves this route, which is `astro dev`. It
      // is prerendered, so in production the web server serves the file
      // and chooses the headers; the serving contract in CLAUDE.md asks
      // for text/plain, which RFC 9116 requires.
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
