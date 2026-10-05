import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Astro's HTML compression drops whitespace that contains a line break
 * when it sits beside a tag. So a sentence that runs onto a new line
 * after a link, or into one before it, renders with the space gone:
 * "Clients like Bravo Farms kept asking" came out as "Clients
 * likeBravo Farmskept asking", and nineteen other joins across the site
 * the same way. A space the reader needs is written as {" "} at the end
 * of the line.
 *
 * Checked in the source rather than the build because two of the pages
 * render per request, and one broken join appeared only in the form's
 * thank-you state, which no static scan sees.
 */
const INLINE = "(?:a|strong|em|b|i|span|cite|code|abbr|time|small|mark)";
const endsWithClose = new RegExp(`</${INLINE}>\\s*$`);
const endsWithText = /[A-Za-z0-9,;:)$~]\s*$|&[a-z]+;\s*$/;
const startsWithText = /^\s*([A-Za-z0-9($~“‘]|&(ldquo|lsquo|mdash|ndash|quot);)/;
const startsWithOpen = new RegExp(`^\\s*<${INLINE}\\b`);

const astroFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? astroFiles(full) : full.endsWith(".astro") ? [full] : [];
  });

function brokenJoins(file: string): string[] {
  const lines = readFileSync(file, "utf8").split("\n");
  const fences = lines.flatMap((l, i) => (l.trim() === "---" ? [i] : []));
  const start = fences[0] === 0 && fences[1] !== undefined ? fences[1] + 1 : 0;
  const found: string[] = [];
  for (let i = start; i < lines.length - 1; i++) {
    const [a = "", b = ""] = [lines[i], lines[i + 1]];
    if (/^\s*(\/\/|\{\/\*|\*)/.test(a)) continue;
    const afterClose = endsWithClose.test(a) && startsWithText.test(b);
    const beforeOpen = endsWithText.test(a) && !a.trimEnd().endsWith(">") && startsWithOpen.test(b);
    if (afterClose || beforeOpen)
      found.push(`${file}:${i + 1}  ${a.trim().slice(-40)} ⏎ ${b.trim().slice(0, 40)}`);
  }
  return found;
}

describe("text beside an inline element keeps its space", () => {
  it.each(astroFiles("src"))("%s", (file) => {
    expect(brokenJoins(file)).toEqual([]);
  });
});
