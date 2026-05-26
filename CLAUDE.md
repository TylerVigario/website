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

Stack: Next 16 App Router, Tailwind v4, better-sqlite3, nodemailer +
react-email for the optional submission-notification email (templates
in `src/emails/`), `@sentry/nextjs` for error + perf
monitoring (no-op when DSNs unset), react-hook-form + zodResolver
for form validation. No auth, no API consumers other than the site's
own forms.

License: **AGPL-3.0-or-later** for source code. Brand assets in
`public/images/` (VTS logo, photos, marketing graphics) are All
Rights Reserved — separate from the AGPL grant. The site's footer
carries a "Source" link to discharge AGPL §13's network-interaction
obligation; if you ever rename the GitHub repo or change the public
URL, that link in [Footer.tsx](src/components/Footer.tsx) moves with
it. The RPM is not distributed (private LAN-only dnf repo); the
source code is the public artifact.

## Deploy contract

This repo owns its own deploy contract — see
[`docs/deployment.md`](docs/deployment.md). Single-line summary:

**RPM-as-artifact.** A self-hosted GitHub Actions runner on the prod
host builds + `sudo rpmsign`s `vigario-website-<v>-1.fc43.x86_64.rpm`,
copies it into the LAN-only private dnf repo at `/srv/dnf-repo-private/`
(served via `http://repo.lan/`), attaches it to the GitHub Release.
Production runs `sudo dnf --refresh upgrade vigario-website`
when ready. Spec lives at
[`packaging/vigario-website.spec`](packaging/vigario-website.spec);
`%build` invokes `npm ci && npm run build`; `%install` lays out the
tree under `/usr/share/vigario-website/`.

[`server.ts`](server.ts) is the custom Next.js entrypoint — esbuild
compiles it to `server.js` at the repo root via
[`scripts/build-server.ts`](scripts/build-server.ts). The postbuild
step [`scripts/postbuild.ts`](scripts/postbuild.ts) real-boot smokes
the bundle against a hermetic stub env (port bind, SIGTERM, assert
exit 0). All three run in `%build`.

The prior contract (build-on-prod, shared with `vis-daily-tracker`,
`turf-tracker`, and `server-admin`) is retired here. The other repos
follow the same migration on their own timeline.

## Core vocabulary

- **Quote** — a "request a quote" submission from the main contact form. Schema in [`src/lib/api/quote.ts`](src/lib/api/quote.ts). Route handler at [`src/app/api/quote/route.ts`](src/app/api/quote/route.ts).
- **POTS audit** — a "free phone-bill audit" submission from the `/pots-migration` landing page. Different schema ([`src/lib/api/pots-audit.ts`](src/lib/api/pots-audit.ts)), same destination row.
- **`quotes` table** — single SQLite table that holds both kinds of submission. The `services` column distinguishes: a real services array for quote submissions, the literal string `"POTS Migration Audit"` for audit submissions. Schema is `CREATE TABLE IF NOT EXISTS` inside `getDb()` — no migrations.
- **`required-env.json`** — the canonical list of required env-var names. Imported by [`src/lib/runtime-config.ts`](src/lib/runtime-config.ts) for app-startup validation, and cited by [`docs/deployment.md`](docs/deployment.md) as the runtime env contract (the deploy mechanism is responsible for getting these into `process.env`; the app validates them at boot). [`tests/required-env.test.ts`](tests/required-env.test.ts) asserts the shape on every CI run + pre-commit.
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
│   ├── api/
│   │   ├── error.ts                  # ProblemDetails zod schema + zodError() helper (RFC 9457)
│   │   ├── quote.ts                  # QuoteRequest zod schema (shared client + server)
│   │   └── pots-audit.ts             # PotsAuditRequest zod schema (shared)
│   └── email/mailer.ts               # nodemailer transport + react-email render; sendQuote/PotsAuditNotification (best-effort, Sentry-captured). Imported by the two POST routes.
├── emails/                           # react-email templates: quote-request.tsx, pots-audit-request.tsx, components/layout.tsx (preview via `npm run email:dev`)
├── components/
│   ├── ContactForm.tsx               # The shared quote form
│   ├── Nav.tsx, Footer.tsx, Hero.tsx, FadeIn.tsx, etc.
├── instrumentation.ts                # Next runtime hook — Sentry init + runtime-config validation at startup
├── instrumentation-client.ts         # Sentry browser init (replays-on-error, masked PII, extension-frame filter)
├── sentry.server.config.ts           # Sentry node-runtime init
└── sentry.edge.config.ts             # Sentry edge-runtime init (wired but no edge handlers yet)

server.ts                             # custom entrypoint source (esbuild → server.js at repo root)
scripts/
├── build-server.ts                   # esbuild compile of server.ts; --check smoke after
├── postbuild.ts                      # real-boot smoke (hermetic env, port bind, SIGTERM, exit-0)
└── check-public-env.ts               # fails build if a required NEXT_PUBLIC_* is missing from build-time env

tests/
└── required-env.test.ts              # contract shape check on src/lib/required-env.json

docs/
└── deployment.md                     # source-side deploy contract — RPM-as-artifact

packaging/
├── vigario-website.spec         # RPM spec; %build invokes `npm ci && npm run build`
├── vigario-website.service      # systemd service unit (installed under /usr/lib/systemd/system/)
├── vigario-website.tmpfiles.conf # /var/lib + /var/cache state-dir ownership
├── vigario-website.sysusers     # sysusers.d snippet (declarative system user creation)
├── apache-snippet.conf               # Apache reverse-proxy snippet (operator Includes from their own vhost)
└── default.env                       # canonical env defaults (installed RO at /usr/lib/<pkg>/default.env)
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
  // SMTP failure is best-effort). mailer.ts Sentry-captures the
  // failure with redacted context and rethrows; the route catches it
  // and logs via console.error.
}
```

## Commands

```bash
npm run dev                       # Next dev server (no custom server)
npm run dev:server                # tsx server.ts — exercises the custom entrypoint. NEEDS prior `npm run build` (server.ts hardcodes dev: false; app.prepare() reads .next/).
npm run build                     # prebuild (check:public-env + build:server) → next build → postbuild real-boot smoke
npm start                         # node server.js (after build)
npm run typecheck                 # tsc --noEmit
npm test                          # vitest run (currently just required-env.test.ts)
npm run lint                      # eslint (js) + markdownlint (md)
npm run format                    # prettier --check
npm run format:fix                # prettier --write
npm run ci                        # lint + typecheck + format + test (gate umbrella)
npm run clean                     # rm .next, server.js, .eslintcache, node_modules/.cache
```

## Code style & conventions

- Prettier: 100 col, double quotes, trailing commas, semicolons.
- ESLint flat config with type-aware rules (`recommendedTypeChecked`). `req.json()` returns `any` — always parse through a zod schema.
- Path alias: `@/*` → `src/*`.
- **Conventional Commits** — Angular 10-type set: `feat` (minor bump), `fix` / `revert` (patch bump), and `refactor` / `perf` / `ci` / `build` / `docs` / `test` / `chore` (no bump, no changelog entry). **Type = release impact, not change-nature** — a bug fix inside CI infra is `ci:` (no release), not `fix(ci):`. Matches pipetree's set (the canonical sibling). `.commitlintrc.js` enforces lowercase subject + the type whitelist; the matching bump matrix lives in `cliff.toml`'s `commit_parsers`. `footer-leading-blank` is deliberately off (the conventional-changelog parser greedy-detected mid-body `Word:` line starts as the footer boundary and false-fired on natural prose like "What landed:" / "Why:"; the comment in `.commitlintrc.js` records why).
- Husky hooks: `pre-commit` runs `lint-staged` (with Windows defensive re-stage) → `typecheck` → `test`; `commit-msg` runs `commitlint`; `pre-push` enforces the `<type>/<slug>` branch-name convention.
- `CHANGELOG.md` is regenerated from commits by git-cliff at release time — never hand-edit. Fix the commit message, not the changelog. (Because only `feat`/`fix`/`revert` are parsed, a regeneration drops historical `refactor`/`perf` entries — the changelog reflects user-facing change, not every commit.)

## Git + PR workflow

Hard rules. These mirror pipetree's; they exist because violating them produced concrete, hard-to-undo damage in the sibling repos.

- **No direct commits to `main`.** Always branch first — `git branch --show-current` before any commit; if it says `main`, `git checkout -b <type>/<slug>` first. The release workflow's `chore(release)` push is the only thing that lands directly on `main`.
- **Linear-only `main`, no force-push.** Rebase is the workflow. If a pull created a merge commit, fix it (reset + rebase + re-apply) rather than merging.
- **Type = release impact, not change-nature.** The commit/PR *type* carries "does this ship to users" (only `feat`/`fix`/`revert` bump); the *scope* carries "where in the codebase." A bug fix inside CI infrastructure is `ci:` (no release), not `fix(ci):` (would bump patch).
- **PR titles MUST be conventional.** Squash-merge uses the PR title as `main`'s commit message, so a non-conventional title pollutes `main` and breaks the release pipeline that walks commits to drive bumps. Enforced by [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml), which reuses `.commitlintrc.js` as the single source of truth.
- **Branch names match `<type>/<slug>`** — same type vocabulary as commitlint, plus `integration` for multi-PR series. Enforced by `.husky/pre-push`. Bypass once with `git push --no-verify`; don't make a habit of it.
- **Never force-push a closed PR's branch.** GitHub permanently locks reopen with "branch was force-pushed or recreated." If a force-push is needed, confirm the PR is currently OPEN first (`gh pr view <n> --json state`).
- **PR numbers are permanent.** When `gh pr reopen` / `gh pr edit` fails on the right PR, STOP and ask — never fall back to `gh pr create` for the same body of work, which burns a PR number on a duplicate.
- **Empty commits drop on rebase-update.** `git commit --allow-empty` + GitHub's rebase-update silently drops the commit and auto-closes the PR. Make the commit non-empty, or use merge-update.

### Multi-PR series

A change spanning 2+ PRs needs the series-as-shipped to be what you tested, not the per-PR view (per-PR green ≠ series-as-shipped green).

- **Predictable upfront**: branch `integration/<slug>` off `main`; sub-PRs target the integration branch (each still gets full CI via `pull_request`). The closing `integration/<slug>` → `main` PR is the release unit.
- **Not predictable upfront**: control the release boundary with commit type. Intermediate PRs merge as `refactor:` / `chore:` (no bump); the closing PR that makes the series cohere gets `fix:` / `feat:` and ships.

Don't introduce a permanent `develop` branch — the ceremony outweighs the benefit for a single-prod app. Integration branches are short-lived and per-series; `main` stays trunk.

## Environment

- **Dev**: Windows 11 + git-bash. Node via `fnm` — Bash sessions need `eval "$(fnm env --use-on-cd --shell bash)"` once before `npm`/`node` resolve. PowerShell tool also available.
- **Prod**: Fedora 43 + systemd. Service binds 127.0.0.1 by default ([`server.ts`](server.ts)); operator's reverse proxy (Apache) fronts on :443. App tree at `/usr/share/vigario-website/` (RPM-owned, read-only). SQLite at `/var/lib/vigario-website/quotes.db` (StateDirectory, owned by `website:website`). Env: canonical defaults at `/usr/lib/<pkg>/default.env` (RPM-owned), operator overrides at `/etc/sysconfig/<pkg>` (NOT in RPM).
- **Tools required on prod for the *runtime*** are just `nodejs24` (pulled in by the RPM's `Requires:`). Build tooling (`make`/`g++`/`python`/`node-gyp`/`rpm-build`/`rpm-sign`/`createrepo_c`) lives on the prod host too because the self-hosted GitHub Actions runner runs there; build + sign + publish all happen locally. better-sqlite3 still compiles to a `.node` file once per release, just on the runner not at install time.

## Guardrails — things that break correctness if ignored

- **`Sentry.close()` requires the default import.** [`server.ts`](server.ts) uses `import Sentry from "@sentry/nextjs"`, not `import * as Sentry from`. The namespace form silently lacks `Sentry.close` under the CJS-via-ESM-namespace shape `@sentry/nextjs` ships — a deploy with the wrong form skips the Sentry flush on every shutdown without erroring. Everywhere else (instrumentation, error boundaries, sentry.{server,edge}.config.ts) keeps namespace — those only call `init` / `captureException` / `captureRequestError`, which exist on both shapes.
- **`SQLITE_PATH` must be absolute.** [`src/lib/runtime-config.ts`](src/lib/runtime-config.ts) rejects relative paths at startup. Don't default it; don't make it optional; don't fall back to cwd.
- **Don't wrap route handlers in top-level try/catch.** Errors must propagate to Next so `onRequestError` (in [`src/instrumentation.ts`](src/instrumentation.ts)) forwards them to Sentry. The email-send `try/catch` inside the route is the only legitimate catch — the row is already saved by that point, the email is best-effort.
- **Don't drift the spec's runtime contract from the unit + vhost + env template.** [`packaging/vigario-website.spec`](../packaging/vigario-website.spec) declares paths under `/usr/share/<pkg>/`, `/var/lib/<pkg>/`, `/etc/<pkg>/`. The systemd unit's `WorkingDirectory`, `EnvironmentFile`, `StateDirectory`, and `CacheDirectory` must match. The vhost's `ProxyPass` target must match the env's `PORT`. Misalignment shows up as runtime path errors that are obvious in hindsight and expensive to debug live.
- **Don't add `output: "standalone"` back.** Next's static-trace machinery keeps tripping over custom server entrypoints + dynamic requires (v2.80.0–v2.83.0 in vis-daily-tracker were four consecutive bad releases). Under the current shape, `next() + app.prepare()` works because the full Next module tree is present in `/usr/share/vigario-website/node_modules/`. Shipping a 100MB+ RPM beats a flaky tracer.
- **Don't bypass `check:public-env`.** Required `NEXT_PUBLIC_*` vars missing from the build-time env get inlined as literal `undefined` in client chunks — silent runtime degradation. The check fails the build loudly. Optional `NEXT_PUBLIC_*` (currently just `NEXT_PUBLIC_SENTRY_DSN`) lives in the allowlist inside the script and only emits a warning.
- **Bump Node major across all five pins together.** `NODE_VERSION` env in `.github/workflows/release.yml`, `.nvmrc`, `package.json#engines.node`, the RPM spec's `Requires: nodejs<N>`, and the systemd unit's `ExecStart=/usr/bin/node-<N>` must agree. The gate's first step enforces three of the five; the spec and unit have to be bumped manually in lockstep. Why the explicit versioned binary: Fedora's unversioned `nodejs` package on F43 is v22; `/usr/bin/node` would resolve to that. `nodejs24` is a parallel-install package that ships `/usr/bin/node-24` only.
- **`better-sqlite3` is a native module.** Marked external in [`next.config.ts`](next.config.ts)'s `serverExternalPackages` and [`scripts/build-server.ts`](scripts/build-server.ts)'s esbuild externals. The native `.node` binding compiles during `npm ci` on the self-hosted runner (which IS the prod host) and ships pre-built in the RPM — production never recompiles it. Bumping the Node major changes the binding's ABI; the gate's Node-major-pin-alignment step is the canary.
