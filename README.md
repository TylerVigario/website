# Vigario Technology Solutions

Marketing front for Vigario Technology Solutions, but really this exists
because I needed somewhere for businesses panicking about POTS sunset to
land. Same deploy contract as
[vis-daily-tracker](https://github.com/TylerVigario/vis-daily-tracker) —
the two source apps and the prod-side deploy script (`server-admin`)
are standardized on the same shape. The contract itself lives in
[docs/deployment.md](docs/deployment.md); read that for anything past
"how do I run it locally."

Stack: Next 16 (App Router), Tailwind v4, better-sqlite3 for
quote/audit submissions, nodemailer for the optional "someone filled
out a form" email, Sentry (`@sentry/nextjs`) for error + performance
monitoring (no-op when DSNs unset).

## Local dev

```bash
cp .env.example .env.local   # SQLITE_PATH at minimum (absolute path)
mkdir -p data                # The data dir is gitignored
npm ci
npm run dev
```

`SQLITE_PATH` must be an absolute path — relative paths are rejected at
startup by [src/lib/runtime-config.ts](src/lib/runtime-config.ts) (they
break under systemd, and the dev/prod fail-fast surface should match).

`npm run dev:server` runs the custom server (`tsx server.ts`) instead
of `next dev` — useful for testing shutdown behavior locally. It needs
a prior `npm run build` because `server.ts` hardcodes `dev: false` and
`app.prepare()` reads `.next/`. Cold-running it without a build fails
with a missing-`.next/` error.

Pre-commit hook runs lint-staged (eslint --fix + prettier) then
`tsc --noEmit`. Commitlint enforces the 6-type set on the message:
`feat | fix | refactor | docs | test | chore`. Don't try to be clever.

## Where stuff lives

```text
src/app/
  (main)/                      # marketing pages: home, about, contact, /services/*
  pots-migration/POTSLanding   # POTS-to-VoIP landing (the reason the form pipeline exists)
  api/quote                    # POST: zod-validated, writes to sqlite, optionally emails me
  api/pots-audit               # POST: same flow, scoped to the POTS landing page
  api/health                   # GET: opens db, SELECT 1 FROM sqlite_schema. Deploy script hits this.
src/lib/
  db.ts                        # better-sqlite3 singleton on globalThis (server.js uses it on shutdown)
  runtime-config.ts            # validates required env at startup; fails fast before serving traffic
  required-env.json            # single source of truth for required-env names
  api/                         # zod: QuoteRequest, PotsAuditRequest, ProblemDetails (RFC 9457)
  services.tsx                 # service catalog (titles, blurbs, icons)
src/components/                # Nav, Hero, ContactForm, FadeIn, the usual
src/instrumentation.ts         # Next runtime hook: Sentry init + runtime-config validation at startup
src/instrumentation-client.ts  # Sentry browser init (replays-on-error, masked PII, extension-frame filter)
src/sentry.server.config.ts    # Sentry node-runtime init (loaded by instrumentation.ts)
src/sentry.edge.config.ts      # Sentry edge-runtime init (no edge handlers yet, wired anyway)
server.ts                      # source for the custom entrypoint (esbuild → server.js at repo root)
scripts/build-server.ts        # compile server.ts → server.js
scripts/postbuild.ts           # real-boot smoke against the just-built server.js (hermetic env)
scripts/check-public-env.ts    # fails build if a required NEXT_PUBLIC_* is missing from build-time env
```

## Build & release

**Build-on-prod.** No CI-built artifact. The gate validates that the
tagged commit builds cleanly; production clones the tag and runs
`npm ci && npm run build` itself. The standalone-tracer model produced
four consecutive bad releases in vis-daily-tracker (v2.80.0–v2.83.0)
before the pivot — see [docs/deployment.md](docs/deployment.md) for the
full rationale.

`.github/workflows/release.yml`:

- **Gate** (runs on PR + push to main + dispatch): `npm ci` →
  typecheck → lint → format → build (with the real-boot postbuild
  smoke against the just-built server.js). First step cross-checks
  `NODE_VERSION` env, `.nvmrc`, and `engines.node` for major-version
  agreement.
- **Release** (dispatch only): git-cliff bumps version
  (`feat→minor`, `fix/refactor→patch`, breaking→major;
  chore/docs/test/build/ci skip), tags, creates the GitHub Release.
  The Release carries no asset — the tagged commit IS the
  deliverable.

CHANGELOG is regenerated each release from commit messages — don't
hand-edit it. If the changelog reads wrong, fix the commit message
before tagging, or amend cliff.toml's parsers/grouping.

## Prod side (the Fedora box)

```text
/opt/website/
  releases/<tag>/          # checked-out tag, built in place
  current → releases/<tag> # systemd ExecStart follows the symlink
  data/                    # SQLite db lives HERE, outside releases. Never bundle it.
  .env                     # SQLITE_PATH=/opt/website/data/quotes.db, SMTP_*, SENTRY_*, prod-owned
```

Deploy: prod listens for `release.published`, clones the tag into
`releases/<tag>/`, runs `npm ci && npm run build`, smokes against
`/api/health`, swaps `current`. Keeps last N releases. Pre-deploy
backup is `sqlite3 quotes.db .backup` via `server-admin`.

Apache reverse-proxies to port 3000. Server binds `127.0.0.1` by
default — prod overrides `HOSTNAME=0.0.0.0` in `.env` to expose. The
loopback default is the safe-by-default fallback if `.env` ever loses
the override.

`systemctl stop` is a clean exit 0 — server.js drains in-flight
requests (30s cap), closes the SQLite handle, flushes Sentry, then
exits. `OnFailure=systemd-failure-notify` only fires on real crashes,
not deploys.

## Things that have bitten me / will bite me again

- **Node major drift**. Bump `NODE_VERSION` env, `.nvmrc`, and
  `engines.node` in the same commit. The gate enforces it now but I'll
  forget at 11pm and try to bypass it.
- **better-sqlite3 native binding**. `npm ci` on prod compiles
  against the host's Node major. Bump Node major = ABI change. Prod
  needs the matching Node major installed before `npm ci` runs.
- **SQLITE_PATH must be absolute**. App throws at startup via
  runtime-config if unset or relative. No cwd fallback — that bit me
  when an old deploy wrote `data/quotes.db` inside a release dir that
  got nuked on the next swap.
- **Health check is `/api/health`**, not `/`. The homepage rendering
  200 just means React ran; `/api/health` actually opens the db.
- **Type-aware ESLint** (`recommendedTypeChecked`) is on. `req.json()`
  is `any`. Parse through a zod schema in `src/lib/api/`.
- **Sentry default import in server.ts**. The shutdown handler calls
  `Sentry.close()` which silently doesn't exist on the namespace form
  (`import * as Sentry`) under the CJS-via-ESM-namespace shape
  `@sentry/nextjs` ships. Default import is load-bearing.
- **Sentry release identifier** is `vigario-technology-solutions@<version>`,
  pinned in next.config.ts. If you ever rename the package slug, that
  string moves with it (search the project — it's also referenced from
  the Sentry config files for traceability).
- **Tests run via vitest** — `npm test` (one-shot) or `npm run test:watch`.
  Currently just `tests/required-env.test.ts` (contract-required shape
  check on `src/lib/required-env.json`). The pre-commit hook and the
  CI gate both run them.

## Domain

`vigario.tech` once DNS/SSL is sorted. For now it answers on
tylervigario.com.
