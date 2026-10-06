/**
 * The forms, end to end, without JavaScript, against the built server.
 *
 * Every other test reaches the submission path from inside: a route
 * handler called with a hand-made Request, a module with its database
 * mocked. None of them goes through what a visitor's browser goes
 * through, which is the adapter, Astro's origin check, the body limit
 * and the redirect a page sends back. The no-JS path is the one a broken
 * script falls back to, so it is the one that has to work when nothing
 * else does, and the one least likely to be tried by hand.
 *
 * So this boots `dist/server/entry.mjs` on a scratch database, posts to
 * both pages and the API the way a browser behind the proxy would, and
 * then reads the database to see exactly what was stored. The headers
 * are the serving contract in CLAUDE.md: the proxy forwards the host and
 * sets X-Forwarded-Proto: https, and leaves Origin as the browser sent
 * it. Two of the checks are that contract's failure modes.
 *
 * Written in Node rather than shell, like check-bundles.ts, so it runs
 * wherever `npm run ci` does. Mail is forced off: a developer's shell
 * with SMTP_* set must not send notifications for test leads.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { BODY_LIMIT_BYTES } from "../src/lib/forms/limits.ts";
import { inlineCodeIn } from "./inline-code.ts";

const ENTRY = "dist/server/entry.mjs";
if (!existsSync(ENTRY)) {
  console.error(`error: ${ENTRY} does not exist — run \`npm run build\` first.`);
  process.exit(1);
}

// The site the build was made for, from the build itself, so the origin
// posted from is the one the server was configured to trust.
const robots = readFileSync("dist/client/robots.txt", "utf8");
const SITE = new URL(/^Sitemap:\s*(\S+)/m.exec(robots)?.[1] ?? "").origin;

/** A port nothing is listening on. */
const port = await new Promise<number>((resolve, reject) => {
  const probe = createServer();
  probe.on("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address() as AddressInfo;
    probe.close(() => resolve(port));
  });
});

const dir = mkdtempSync(path.join(tmpdir(), "vts-forms-"));
const env: NodeJS.ProcessEnv = {
  ...process.env,
  SQLITE_PATH: path.join(dir, "forms.db"),
  HOST: "127.0.0.1",
  PORT: String(port),
};
for (const key of Object.keys(env)) {
  if (key.startsWith("SMTP_") || key === "NOTIFY_EMAIL" || key === "HEALTH_MIN_FREE_MB") {
    delete env[key];
  }
}

const server = spawn(process.execPath, [ENTRY], { env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
server.stdout.on("data", (d) => (output += d));
server.stderr.on("data", (d) => (output += d));
let exited = false;
server.on("exit", () => (exited = true));

const BASE = `http://127.0.0.1:${port}`;
const failures = [];

function finish() {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
  if (failures.length) {
    console.error(`\n${failures.length} form check(s) failed. Server output:\n${output}`);
    process.exit(1);
  }
  console.log("\nBoth forms work without JavaScript, through the proxy's headers.");
}

// Up within ten seconds, or it is not going to be.
const deadline = Date.now() + 10_000;
for (;;) {
  if (exited) {
    failures.push("the server exited before it answered");
    finish();
  }
  try {
    await fetch(`${BASE}/api/health`);
    break;
  } catch {
    if (Date.now() > deadline) {
      failures.push("the server did not answer within 10 s");
      finish();
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

const FORM = "application/x-www-form-urlencoded";
const site = new URL(SITE);
/** What arrives at Node from behind the proxy. */
const proxied = {
  "x-forwarded-host": site.host,
  "x-forwarded-proto": "https",
  origin: SITE,
};

/** A request as the browser sends it through the proxy. */
function post(
  pathname: string,
  body: string | Record<string, string>,
  { type = FORM, headers = {} }: { type?: string; headers?: Record<string, string> } = {},
) {
  return fetch(`${BASE}${pathname}`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": type, ...proxied, ...headers },
    body: typeof body === "string" ? body : new URLSearchParams(body).toString(),
  });
}

async function check(
  name: string,
  request: () => Promise<Response>,
  expect: (res: Response, text: string) => string,
) {
  try {
    const res = await request();
    const text = await res.text();
    const problem = expect(res, text);
    if (problem) failures.push(`${name}: ${problem}`);
    console.log(`  ${problem ? "✗" : "✓"} ${name}${problem ? ` — ${problem}` : ""}`);
  } catch (err) {
    failures.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`  ✗ ${name} — threw ${String(err)}`);
  }
}

/** Each expectation returns a description of what was wrong, or nothing. */
const status = (res: Response, want: number) =>
  res.status === want ? "" : `got ${res.status}, want ${want}`;
const redirectTo = (res: Response, want: number, location: string) =>
  status(res, want) ||
  (res.headers.get("location") === location
    ? ""
    : `went to ${res.headers.get("location")}, want ${location}`);
const noStore = (res: Response) =>
  (res.headers.get("cache-control") ?? "").includes("no-store")
    ? ""
    : `Cache-Control is "${res.headers.get("cache-control")}"`;
/** The CSP has no 'unsafe-inline'; these two pages render per request, so
 *  check-bundles.ts never sees them. */
const noInlineCode = (text: string) =>
  inlineCodeIn(text)
    .map((what) => `the page has ${what}, which the CSP would block`)
    .join("; ");
const contains = (text: string, ...needles: string[]) =>
  needles
    .filter((n) => !text.includes(n))
    .map((n) => `the page does not contain "${n}"`)
    .join("; ");

const QUOTE = {
  name: "check-forms quote",
  contact: "dana@example.com",
  services: "Networking & WiFi",
  details: "sent without JavaScript",
};
const AUDIT = {
  business: "check-forms audit",
  name: "Dana",
  contact: "559 555 0100",
  bill: "$100–$300",
};

console.log(`Forms, without JavaScript, against ${ENTRY} as ${SITE}:`);

await check(
  "/contact is served per request and never stored",
  () => fetch(`${BASE}/contact`),
  (res, text) =>
    status(res, 200) || noStore(res) || contains(text, 'method="post"') || noInlineCode(text),
);
await check(
  "/pots-migration has no inline code either",
  () => fetch(`${BASE}/pots-migration`),
  (res, text) => status(res, 200) || noInlineCode(text),
);
await check(
  "a valid quote is saved and redirected, so a reload cannot resend it",
  () => post("/contact", QUOTE),
  (res) => redirectTo(res, 303, "/contact?sent=1"),
);
await check(
  "an invalid quote comes back 422 with everything typed still in it",
  () => post("/contact", { ...QUOTE, name: "", details: "kept, not lost" }),
  (res, text) =>
    status(res, 422) ||
    noStore(res) ||
    contains(text, "kept, not lost", "Please enter your name.") ||
    noInlineCode(text),
);
await check(
  `a quote over ${BODY_LIMIT_BYTES / 1024} KB is refused 413 with a form-level message`,
  () => post("/contact", { ...QUOTE, details: "x".repeat(BODY_LIMIT_BYTES) }),
  (res, text) => status(res, 413) || contains(text, "more than this form can take"),
);
await check(
  "a submission caught by the honeypot is answered like a real one",
  () => post("/contact", { ...QUOTE, name: "check-forms trapped", website: "http://spam.example" }),
  (res) => redirectTo(res, 303, "/contact?sent=1"),
);
await check(
  "a post from another site is refused",
  () => post("/contact", QUOTE, { headers: { origin: "https://elsewhere.example" } }),
  (res) => status(res, 403),
);
await check(
  "a proxy that rewrites Origin to http breaks every no-JS submit (CLAUDE.md: do not)",
  () => post("/contact", QUOTE, { headers: { origin: `http://${site.host}` } }),
  (res) => status(res, 403),
);
await check(
  "a valid POTS audit is saved and redirected back to the form's anchor",
  () => post("/pots-migration", AUDIT),
  (res) => redirectTo(res, 303, "/pots-migration?sent=1#audit"),
);
await check(
  "an invalid POTS audit comes back 422 with what was typed",
  () => post("/pots-migration", { ...AUDIT, bill: "", business: "kept business" }),
  (res, text) => status(res, 422) || contains(text, "kept business", "Pick a range."),
);
await check(
  "a form post to the API is handed to the page with its body (307)",
  () => post("/api/quote", QUOTE),
  (res) => redirectTo(res, 307, "/contact"),
);
await check(
  "the API stores a valid JSON quote",
  () =>
    post(
      "/api/quote",
      JSON.stringify({ ...QUOTE, name: "check-forms api", services: [QUOTE.services] }),
      { type: "application/json" },
    ),
  (res, text) => status(res, 200) || contains(text, '"success":true'),
);
await check(
  "the API answers an invalid quote 422 as Problem Details",
  () => post("/api/quote", JSON.stringify({ name: "" }), { type: "application/json" }),
  (res) =>
    status(res, 422) ||
    ((res.headers.get("content-type") ?? "").includes("application/problem+json")
      ? ""
      : `Content-Type is ${res.headers.get("content-type")}`),
);
await check(
  "the API answers a body it cannot read 400",
  () => post("/api/quote", "{not json", { type: "application/json" }),
  (res) => status(res, 400),
);
await check(
  "the health check passes",
  () => fetch(`${BASE}/api/health`),
  (res) => status(res, 200),
);

// What the database holds is the point of all of the above: the three
// valid submissions, and nothing from the rest.
const db = new Database(env.SQLITE_PATH, { readonly: true });
const stored = db
  .prepare("SELECT name FROM quotes ORDER BY id")
  .all()
  .map((r) => (r as { name: string }).name);
db.close();
const want = ["check-forms quote", "Dana", "check-forms api"];
const same = stored.length === want.length && stored.every((n, i) => n === want[i]);
console.log(`  ${same ? "✓" : "✗"} exactly the valid submissions were stored`);
if (!same) {
  failures.push(`stored ${JSON.stringify(stored)}, want ${JSON.stringify(want)}`);
}

finish();
