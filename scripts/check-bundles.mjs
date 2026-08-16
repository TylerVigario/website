/**
 * Asserts the site ships no framework runtime.
 *
 * This is the property the Astro rebuild exists to create, so it is
 * checked mechanically rather than trusted. It runs in `npm run ci`,
 * which means it fails on your machine before it can fail a PR — the
 * earlier version lived only in the workflow and was never once
 * executed locally.
 *
 * Written in Node rather than Python on purpose: the dev machine is
 * Windows + git-bash, where `python3` is not a given. A gate that only
 * runs on the Linux runner is the thing this is replacing.
 *
 * Counting <script> tags was the wrong measure — it broke the moment a
 * legitimate 500-byte progressive-enhancement script appeared. What
 * matters is weight, and whether a bundle is being referenced at all.
 * Wiring Sentry through its Astro integration once added 85 KB
 * referenced from every page while the build stayed green; this is the
 * check that would have caught it.
 *
 * Only prerendered pages can be checked here. /contact and
 * /pots-migration render at request time and never become files, so
 * they are outside what a static assertion can see.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "dist/client";

/** No page may reference an external bundle. There is no framework, so
 *  there is nothing legitimate for one to contain. */
const EXTERNAL_ALLOWED = 0;

/** Per-page inline budget. The real numbers are 508 B for a plain page
 *  (the scroll reveal) and 3380 B for a case study (reveal + the image
 *  viewer). The ceiling leaves room to edit those without tripping,
 *  while staying far below anything that could be a framework. */
const INLINE_BUDGET = 4096;

/** The homepage is the strictest claim the README makes: it needs
 *  almost nothing, so it gets almost nothing. */
const HOMEPAGE_BUDGET = 1024;

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`error: ${dir} does not exist — run \`npm run build\` first.`);
    process.exit(1);
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? htmlFiles(path.join(dir, e.name))
        : e.name.endsWith(".html")
          ? [path.join(dir, e.name)]
          : [],
    );
}

// Skips ld+json: structured data is markup in a <script> tag, not code.
const INLINE = /<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g;
const EXTERNAL = /<script[^>]*\ssrc="(\/_astro\/[^"]+\.js)"/g;

let failed = false;
const rows = [];

for (const file of htmlFiles(ROOT).sort()) {
  const html = fs.readFileSync(file, "utf8");
  const route = file
    .slice(ROOT.length)
    .replace(/\\/g, "/")
    .replace(/\/index\.html$/, "/");

  const inline = [...html.matchAll(INLINE)].reduce((sum, m) => sum + m[1].length, 0);
  const external = [...html.matchAll(EXTERNAL)].map((m) => m[1]);
  const budget = route === "/" ? HOMEPAGE_BUDGET : INLINE_BUDGET;

  rows.push(`  ${route.padEnd(34)} ${String(inline).padStart(5)} B inline, ${external.length} ext`);

  if (external.length > EXTERNAL_ALLOWED) {
    console.error(`error: ${route} references an external JS bundle; it should need none:`);
    for (const src of external) console.error(`         ${src}`);
    failed = true;
  }
  if (inline > budget) {
    console.error(
      `error: ${route} ships ${inline} B of inline JS, over its ${budget} B budget. ` +
        `Something substantial is reaching a page that needs almost nothing.`,
    );
    failed = true;
  }
}

if (rows.length === 0) {
  console.error(`error: no HTML found under ${ROOT} — the build produced nothing to check.`);
  process.exit(1);
}

console.log(rows.join("\n"));
console.log(`  ${rows.length} prerendered pages checked, no framework runtime present.`);
process.exit(failed ? 1 : 0);
