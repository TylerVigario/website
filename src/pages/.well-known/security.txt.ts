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
 * worse than none. A year from build, less a day, means every release
 * refreshes it, and a site that has not shipped in a year has a security
 * contact nobody has checked, which is exactly what the field exists to
 * disclose. Less a day because the RFC recommends staying under a year
 * (RFC 9116, section 2.5.5).
 *
 * "From build" means from SOURCE_DATE_EPOCH when it is set, which
 * make-release.ts sets to the commit's time. That is the
 * reproducible-builds convention, and it is what lets two builds of one
 * commit write the same date: with the clock, every build of the same
 * source differed in this one line. A release is cut from the latest
 * merge, so the two are days apart, not months.
 */
function buildTime(): number {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch === undefined || epoch === "") return Date.now();
  // A malformed value is a broken build environment, and an Expires
  // computed from it would be a date nobody chose.
  if (!/^\d+$/.test(epoch))
    throw new Error(`SOURCE_DATE_EPOCH=${epoch} is not a number of seconds`);
  return Number(epoch) * 1000;
}

export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL("https://vigario.tech")).origin;
  const expires = new Date(buildTime() + 364 * 24 * 60 * 60 * 1000).toISOString();

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
