# CLAUDE.md

Context Claude Code needs at the start of every conversation to work
effectively on this codebase. Vocabulary + guardrails + canonical
paths. Everything else is discoverable via grep/glob — don't duplicate
here.

See `README.md` for the feature showcase and design rationale,
`docs/deployment.md` for the deploy contract.

## What this is

Public marketing site for Vigario Technology Solutions (VTS), an
independent IT consultancy. The reason the form pipeline exists at all
is the `/pots-migration` landing page — a campaign target for
businesses panicking about copper-POTS sunset rate hikes. The rest of
the site (home, about, contact, /services/\*) is supporting surface.

Stack: Next 16 App Router, Tailwind v4, better-sqlite3, nodemailer
for optional submission email, `@sentry/nextjs` for error + perf
monitoring (no-op when DSNs unset), react-hook-form + zodResolver
for form validation. No auth, no API consumers other than the site's
own forms.

## Standardization rule (load-bearing)

This repo is one of three Tyler maintains in lockstep:

- **`tylervigario`** (this) — marketing site
- **`vis-daily-tracker`** — internal ops platform
- **`server-admin`** — prod-side deploy script

`vis-daily-tracker/docs/deployment.md` is the **canonical deploy
contract**. Don't deviate. Project-specific bits (SQLite vs Prisma,
no WS, no CLI) fill in around it; structural shape mirrors exactly.
The memory file at
`~/.claude/projects/c--Users-tyler-Projects-tylervigario/memory/feedback_deploy_contract.md`
documents this; the contract itself lives in
[`docs/deployment.md`](docs/deployment.md) (which explicitly cites
the mirroring relationship).

## Core vocabulary

- **Quote** — a "request a quote" submission from the main contact form. Schema in [`src/lib/api/quote.ts`](src/lib/api/quote.ts). Route handler at [`src/app/api/quote/route.ts`](src/app/api/quote/route.ts).
- **POTS audit** — a "free phone-bill audit" submission from the `/pots-migration` landing page. Different schema ([`src/lib/api/pots-audit.ts`](src/lib/api/pots-audit.ts)), same destination row.
- **`quotes` table** — single SQLite table that holds both kinds of submission. The `services` column distinguishes: a real services array for quote submissions, the literal string `"POTS Migration Audit"` for audit submissions. Schema is `CREATE TABLE IF NOT EXISTS` inside `getDb()` — no migrations.
- **`required-env.json`** — the canonical list of required env-var names. Imported by [`src/lib/runtime-config.ts`](src/lib/runtime-config.ts) for startup validation; cited by [`docs/deployment.md`](docs/deployment.md) as the path the prod deploy script must source. [`tests/required-env.test.ts`](tests/required-env.test.ts) asserts the shape on every CI run + pre-commit.
- **Problem Details** — every API error response shape, per RFC 9457. Server emits `{type, title, status, detail?, errors?}` via [`src/lib/api/error.ts`](src/lib/api/error.ts)'s `zodError()` helper. Client (forms) parse via the exported `ProblemDetails` zod schema and map `errors[]` back to inline field errors via RHF `setError`. See "Form patterns" below.

## Key paths

```text
src/
├── app/
│   ├── (main)/                       # marketing pages: home, about, contact, /services/*
│   ├── pots-migration/
│   │   ├── page.tsx
│   │   └── POTSLanding.tsx           # The big landing component — hero, case study, FAQ, form
│   ├── api/
│   │   ├── quote/route.ts            # POST: zod-validated, writes sqlite, optionally emails
│   │   ├── pots-audit/route.ts       # POST: same shape, scoped to /pots-migration
│   │   └── health/route.ts           # GET: opens db, SELECT 1 FROM sqlite_schema. Deploy hits this.
│   ├── error.tsx                     # Segment-level error boundary — Sentry.captureException
│   ├── global-error.tsx              # Top-of-tree error boundary — includes <html><body>
│   └── not-found.tsx                 # 404 with brand styling
├── lib/
│   ├── db.ts                         # better-sqlite3 singleton on globalThis.__sqlite__ (server.ts shutdown reads it)
│   ├── runtime-config.ts             # validates required env at startup; fails fast before serving
│   ├── required-env.json             # single canonical list
│   ├── services.tsx                  # service catalog (titles, blurbs, icons)
│   └── api/
│       ├── error.ts                  # ProblemDetails zod schema + zodError() helper (RFC 9457)
│       ├── quote.ts                  # QuoteRequest zod schema (shared client + server)
│       └── pots-audit.ts             # PotsAuditRequest zod schema (shared)
├── components/
│   ├── ContactForm.tsx               # The shared quote form
│   ├── Nav.tsx, Footer.tsx, Hero.tsx, FadeIn.tsx, etc.
├── instrumentation.ts                # Next runtime hook — Sentry init + runtime-config validation at startup
├── instrumentation-client.ts         # Sentry browser init (replays-on-error, masked PII, extension-frame filter)
├── sentry.server.config.ts           # Sentry node-runtime init
└── sentry.edge.config.ts             # Sentry edge-runtime init (wired but no edge handlers yet)

server.ts                             # custom entrypoint source (esbuild → server.mjs at repo root)
scripts/
├── build-server.ts                   # esbuild compile of server.ts; --check smoke after
├── postbuild.ts                      # real-boot smoke (hermetic env, port bind, SIGTERM, exit-0)
└── check-public-env.ts               # fails build if a required NEXT_PUBLIC_* is missing from build-time env

tests/
└── required-env.test.ts              # contract shape check on src/lib/required-env.json

docs/
└── deployment.md                     # source-side deploy contract — mirrors vis-daily-tracker's
```

## Form patterns (RHF + zod + Problem Details)

Both forms ([`ContactForm.tsx`](src/components/ContactForm.tsx) and
the inline form in
[`POTSLanding.tsx`](src/app/pots-migration/POTSLanding.tsx)) use the
same pattern:

- `useForm({ resolver: zodResolver(<Schema>), mode: "onTouched" })`. Default `reValidateMode: "onChange"` clears server-set errors as the user fixes the field.
- Field-name guard is `Object.keys(<Schema>.shape) as (keyof <Schema>)[]` — never hard-code field lists; the guard auto-syncs with the schema.
- On `!res.ok`, parse via the `ProblemDetails` zod schema. For each entry in `errors[]`, if `isFieldName(e.field)` is true, `setError(e.field, { type: "server", message: e.message })`. Falls back to `setError("root", ...)` for top-level (network, server, unparseable) failures. Both render with `role="alert"`.
- **`isSubmitSuccessful` is the single source of truth for the success view.** Don't add a parallel `useState<boolean>` — `setError` keeps `isSubmitSuccessful` false after server-side failures, so the success view doesn't flash incorrectly.
- **Native `<input type="checkbox">` for chip groups**, not custom buttons. `{...register("services")}` with the same name on every checkbox aggregates values into an array natively. Tailwind `peer-checked:` variants drive the visible chip styling. The hidden checkbox is keyboard- and screen-reader-native.
- a11y baseline: `aria-required="true"` on required inputs, `aria-invalid` toggled dynamically, `aria-describedby="<id>-error"` linking input → `<p role="alert" id="<id>-error">`. The chip group is wrapped in `<fieldset><legend>` with `aria-describedby` for the group-level error.
- Submit button spinner uses `motion-safe:animate-spin` for `prefers-reduced-motion` respect.

Validation messages are user-facing on the zod schema itself
(`"Please enter your name."` etc.), surfaced identically through both
client-side (zodResolver inline) and server-side (Problem Details
`errors[]` → `setError`) paths.

## Route handler pattern

```ts
export async function POST(req: NextRequest) {
  // .catch(() => null) so malformed JSON becomes 400 (Validation Error)
  // not an unhandled throw → Sentry noise event.
  const body: unknown = await req.json().catch(() => null);
  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) return zodError(parsed);

  // Do the work. Genuine errors propagate to Next, which forwards them
  // to Sentry via `onRequestError` in src/instrumentation.ts. NO top-
  // level try/catch — wrapping would hide the error from Sentry.
  // ...

  // Email send retains its own try/catch (the row is already saved;
  // SMTP failure is best-effort, just console.error'd).
}
```

## Deploy contract (one-liner)

Build-on-prod. Production clones the tagged commit, runs
`npm ci && npm run build`, runs the resulting bundle. **No CI-built
tarball, no MANIFEST, no SHA256SUMS.** [`docs/deployment.md`](docs/deployment.md)
is the spec. [`server.ts`](server.ts) is the custom entrypoint
(compiled by `scripts/build-server.ts` to `server.mjs` at repo root).
The postbuild step real-boot smokes the bundle against a hermetic
stub env (bind, SIGTERM, assert exit 0).

## Commands

```bash
npm run dev                       # Next dev server (no custom server)
npm run dev:server                # tsx server.ts — exercises the custom entrypoint. NEEDS prior `npm run build` (server.ts hardcodes dev: false; app.prepare() reads .next/).
npm run build                     # prebuild (check:public-env + build:server) → next build → postbuild real-boot smoke
npm start                         # node server.mjs (after build)
npm run typecheck                 # tsc --noEmit
npm test                          # vitest run (currently just required-env.test.ts)
npm run lint                      # eslint (js) + markdownlint (md)
npm run format                    # prettier --check
npm run format:fix                # prettier --write
npm run ci                        # lint + typecheck + format + test (gate umbrella)
npm run clean                     # rm .next, server.mjs, .eslintcache, node_modules/.cache
```

## Code style & conventions

- Prettier: 100 col, double quotes, trailing commas, semicolons.
- ESLint flat config with type-aware rules (`recommendedTypeChecked`). `req.json()` returns `any` — always parse through a zod schema.
- Path alias: `@/*` → `src/*`.
- **Conventional Commits** — minimalist 6-type set: `feat` (minor bump), `fix` / `refactor` (patch bump), `chore` / `docs` / `test` (skipped from changelog). Same set vis-daily-tracker uses. `.commitlintrc.mjs` enforces lowercase subject + the 6-type whitelist.
- Husky hooks: `pre-commit` runs `lint-staged` (with Windows defensive re-stage) → `typecheck` → `test`; `commit-msg` runs `commitlint`.
- `CHANGELOG.md` is regenerated from commits by git-cliff at release time — never hand-edit. Fix the commit message, not the changelog.

## Environment

- **Dev**: Windows 11 + git-bash. Node via `fnm` — Bash sessions need `eval "$(fnm env --use-on-cd --shell bash)"` once before `npm`/`node` resolve. PowerShell tool also available.
- **Prod**: Fedora + systemd. Service binds 127.0.0.1 by default ([`server.ts`](server.ts)); prod `.env` overrides `HOSTNAME=0.0.0.0` to expose. Apache reverse-proxies to port 3000. SQLite file lives at `/opt/website/data/quotes.db` (outside release dirs so it survives swaps).
- **Tools required on prod**: Node 24 + npm + git. No `make`/`g++`/`python` — every native dep (just `better-sqlite3`) must have a usable prebuilt binary.

## Guardrails — things that break correctness if ignored

- **`Sentry.close()` requires the default import.** [`server.ts`](server.ts) uses `import Sentry from "@sentry/nextjs"`, not `import * as Sentry from`. The namespace form silently lacks `Sentry.close` under the CJS-via-ESM-namespace shape `@sentry/nextjs` ships — a deploy with the wrong form skips the Sentry flush on every shutdown without erroring. Everywhere else (instrumentation, error boundaries, sentry.{server,edge}.config.ts) keeps namespace — those only call `init` / `captureException` / `captureRequestError`, which exist on both shapes.
- **`SQLITE_PATH` must be absolute.** [`src/lib/runtime-config.ts`](src/lib/runtime-config.ts) rejects relative paths at startup. Don't default it; don't make it optional; don't fall back to cwd.
- **Don't wrap route handlers in top-level try/catch.** Errors must propagate to Next so `onRequestError` (in [`src/instrumentation.ts`](src/instrumentation.ts)) forwards them to Sentry. The email-send `try/catch` inside the route is the only legitimate catch — the row is already saved by that point, the email is best-effort.
- **Don't drift the deploy contract.** vis-daily-tracker's `docs/deployment.md` is canonical. If a tylervigario-specific need can't fit, surface it as a contract-extension proposal — never deviate unilaterally. The standardization rule applies across this repo, vis-daily-tracker, and server-admin.
- **Don't add `output: "standalone"` back.** The build-on-prod pivot was deliberate (v2.80.0–v2.83.0 in vis-daily-tracker were four consecutive bad releases against the standalone tracer's preconditions). The wrap-server.js pattern that briefly existed here is also gone — under build-on-prod, `next() + app.prepare()` works because the full Next module tree is present.
- **Don't bypass `check:public-env`.** Required `NEXT_PUBLIC_*` vars missing from the build-time env get inlined as literal `undefined` in client chunks — silent runtime degradation. The check fails the build loudly. Optional `NEXT_PUBLIC_*` (currently just `NEXT_PUBLIC_SENTRY_DSN`) lives in the allowlist inside the script and only emits a warning.
- **Bump Node major across all three pins together.** `NODE_VERSION` env in `.github/workflows/release.yml`, `.nvmrc`, and `package.json#engines.node` must agree — the gate's first step enforces it. Drift would let CI green-light a build prod can't run.
- **`better-sqlite3` is a native module.** Marked external in both [`next.config.ts`](next.config.ts)'s `serverExternalPackages` and [`scripts/build-server.ts`](scripts/build-server.ts)'s esbuild externals. Bumping the Node major recompiles the binding during `npm ci` on prod — must match between build time and runtime.
