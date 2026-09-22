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
 * WHAT IT MEASURES, AND WHY THAT CHANGED. Counting <script> tags was the
 * wrong measure — it broke the moment a legitimate 500-byte progressive
 * enhancement script appeared. It then forbade external bundles outright
 * and budgeted only inline bytes, which was a proxy: everything
 * legitimate happened to be inline, so "references a file" meant
 * "something arrived".
 *
 * Scripts are emitted as files now, because inline script is the one
 * thing that would force the Content-Security-Policy to carry per-page
 * hashes. Under the old rule this build would fail for doing exactly
 * what it should, while a 400 KB file went uncounted if it were ever
 * inlined. So the budget counts INLINE AND EXTERNAL TOGETHER. Weight is
 * what the comment above always said mattered; now it is what is
 * measured. Wiring Sentry through its Astro integration once added 85 KB
 * referenced from every page while the build stayed green; that trips
 * this whether it arrives inline or as a file.
 *
 * Only prerendered pages can be checked here. /contact and
 * /pots-migration render at request time and never become files, so
 * they are outside what a static assertion can see.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "dist/client";

/** Per-page JavaScript budget, inline plus referenced files. The real
 *  numbers are 508 B for a plain page (the scroll reveal) and 3380 B for
 *  a case study (reveal + the image viewer). The ceiling leaves room to
 *  edit those without tripping, while staying far below anything that
 *  could be a framework. */
const JS_BUDGET = 4096;
/** The homepage is the strictest claim the README makes: it needs almost
 *  nothing, so it gets almost nothing. */
const HOMEPAGE_BUDGET = 1024;
/** Referenced scripts must be ours. Anything else means a third-party
 *  origin reached a page — which the CSP would refuse and nothing here
 *  needs. */
const LOCAL_PREFIX = "/_astro/";

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
const INLINE = /<script(?![^>]*ld\+json)(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const EXTERNAL = /<script[^>]*\ssrc="([^"]+)"/g;

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
  const budget = route === "/" ? HOMEPAGE_BUDGET : JS_BUDGET;

  let externalBytes = 0;
  for (const src of external) {
    if (!src.startsWith(LOCAL_PREFIX)) {
      console.error(`error: ${route} loads a script from outside ${LOCAL_PREFIX}: ${src}`);
      failed = true;
      continue;
    }
    const onDisk = path.join(ROOT, src);
    if (!fs.existsSync(onDisk)) {
      // A referenced file that is not there is a broken page, and a
      // budget that counted it as zero would call that fine.
      console.error(`error: ${route} references ${src}, which the build did not emit.`);
      failed = true;
      continue;
    }
    externalBytes += fs.statSync(onDisk).size;
  }

  const total = inline + externalBytes;
  rows.push(
    `  ${route.padEnd(34)} ${String(total).padStart(5)} B js  (${inline} inline + ${externalBytes} in ${external.length} file${external.length === 1 ? "" : "s"})`,
  );

  if (total > budget) {
    console.error(
      `error: ${route} ships ${total} B of JavaScript, over its ${budget} B budget. ` +
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
