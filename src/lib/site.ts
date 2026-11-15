/** The site's public root, as astro.config.ts's `site` names it, without
 *  the trailing slash: what every canonical URL and structured-data @id
 *  is built on. One expression, written once, rather than once a page. */
export function siteRoot(site: URL | undefined): string {
  if (!site) throw new Error("astro.config.ts sets no site, so no page can name its URL");
  return site.href.replace(/\/$/, "");
}
