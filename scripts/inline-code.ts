/**
 * What the Content-Security-Policy refuses, found in a page's HTML.
 *
 * The policy is `script-src 'self'; style-src 'self'` with no
 * 'unsafe-inline', so three things in the markup would be blocked by the
 * browser: an inline script, a <style> element, and a style= attribute.
 * Adding one does not fail the build. It fails on the page, silently, or
 * it gets "fixed" by weakening the policy, which is worse. So the build
 * looks for them instead: check-bundles.ts on every prerendered page and
 * check-forms.ts on the two that render per request.
 *
 * Data blocks are not code. JSON-LD (application/ld+json) and plain JSON
 * are never executed and script-src does not apply to them; every other
 * inline <script>, including speculation rules and import maps, is
 * subject to the policy.
 */
const SCRIPT = /<script\b([^>]*)>/gi;
const DATA_BLOCK = /\stype\s*=\s*["']?application\/(ld\+)?json["']?/i;
const STYLE_ELEMENT = /<style\b/i;
/** A style attribute on any element. Within a tag only, so prose that
 *  mentions style= between tags is not mistaken for one. */
const STYLE_ATTRIBUTE = /<[a-zA-Z][^>]*\sstyle\s*=/;

/** Each kind of inline code the policy would block, described. Empty when
 *  the page is clean. */
export function inlineCodeIn(html: string): string[] {
  const found: string[] = [];
  const inlineScripts = [...html.matchAll(SCRIPT)].filter(
    ([, attrs = ""]) => !/\ssrc\s*=/i.test(attrs) && !DATA_BLOCK.test(attrs),
  ).length;
  if (inlineScripts) found.push(`${inlineScripts} inline <script> element(s)`);
  if (STYLE_ELEMENT.test(html)) found.push("a <style> element");
  if (STYLE_ATTRIBUTE.test(html)) found.push("a style= attribute");
  return found;
}
