/** The site's origin. astro.config.ts gives it to Astro as `site`, which a
 *  page reads as Astro.site; code that runs outside a page, such as the
 *  forms' rules in the browser, reads it here. */
export const SITE = "https://vigario.tech";

/** The site's public root, as astro.config.ts's `site` names it, without
 *  the trailing slash: what every canonical URL and structured-data @id
 *  is built on. One expression, written once, rather than once a page. */
export function siteRoot(site: URL | undefined): string {
  if (!site) throw new Error("astro.config.ts sets no site, so no page can name its URL");
  return site.href.replace(/\/$/, "");
}
