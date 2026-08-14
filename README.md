# Vigario Technology Solutions

Marketing front for Vigario Technology Solutions, but really this exists
because I needed somewhere for businesses panicking about POTS sunset to
land. It does not currently deploy anywhere — the RPM pipeline that
shipped it was retired, and the site is moving to a static shape with a
new release path to be built against that. Prod still serves `v1.10.0`
from the old pipeline until the host is redeployed.

Stack: Next 16 (App Router), Tailwind v4, better-sqlite3 for
quote/audit submissions, nodemailer + react-email for the optional
"someone filled out a form" notification email, Sentry
(`@sentry/nextjs`) for error + performance monitoring (no-op when
DSNs unset).

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
`tsc --noEmit`. Commitlint enforces the Angular type set on the message
— `feat`, `fix`, `refactor`, `perf`, `revert`, `ci`, `build`, `docs`,
`test`, `chore`, lowercase subject. Only `feat`/`fix`/`revert` cut a
release; the rest ship no version bump. Don't try to be clever.

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
  email/mailer.ts              # nodemailer transport + react-email render; best-effort form-notification send (Sentry-captured)
src/emails/                    # react-email templates: quote-request, pots-audit-request + shared layout (preview: npm run email:dev)
src/components/                # Nav, Hero, ContactForm, FadeIn, the usual
src/instrumentation.ts         # Next runtime hook: Sentry init + runtime-config validation at startup
src/instrumentation-client.ts  # Sentry browser init (replays-on-error, masked PII, extension-frame filter)
src/sentry.server.config.ts    # Sentry node-runtime init (loaded by instrumentation.ts)
src/sentry.edge.config.ts      # Sentry edge-runtime init (no edge handlers yet, wired anyway)
server.ts                      # source for the custom entrypoint (esbuild → server.js at repo root)
scripts/build-server.ts        # compile server.ts → server.js
scripts/postbuild.ts           # real-boot smoke against the just-built server.js (hermetic env)
```

## Build & release

**There is no release pipeline.** The RPM one was retired — packaging
tree, release job and deploy contract removed together — and the
replacement is being built against the static shape the site is moving
to, not restored. `v1.10.0` is the last RPM release.

`.github/workflows/ci.yml` is one job, `Gate`, on every PR and every
push to main: Node-major pin check → actionlint → `npm ci` → typecheck
→ lint → format → test → `npm run build`, including the postbuild
real-boot smoke against the compiled `server.js`. Nothing downstream
consumes it. It proves the tree builds, which is the whole claim.

CHANGELOG is regenerated from commit messages by git-cliff — don't
hand-edit it. `cliff.toml` and the conventional-commit convention
outlive the pipeline that used to read them; whatever comes next reads
the same commits.

## Things that have bitten me / will bite me again

- **Node major drift**. Bump `.nvmrc` and `engines.node` together.
  This used to be four pins — the spec's `Requires: nodejs<N>` and the
  unit's `ExecStart=/usr/bin/node-<N>` were the other two and went with
  the packaging tree. The gate check is now the whole of it.
- **better-sqlite3 native binding**. Compiles from source during
  `npm ci`, so it needs a toolchain wherever that runs, and its ABI is
  tied to the Node major. Nothing pre-builds or ships it any more.
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

## License

Source code: **AGPL-3.0-or-later** — see [LICENSE](LICENSE) for the
verbatim license text. If you run a modified version of this code on
a network-accessible server, AGPL §13 obligates you to offer the
modified source to users interacting with it (the footer's "Source"
link is how this site discharges that obligation for its own users).

**Brand assets are excluded from the AGPL grant.** Everything under
`public/images/` — the VTS logo, any client photos, headshots,
graphics produced for marketing — is © Vigario Technology Solutions
and All Rights Reserved. Fork the code freely, but the visual
identity stays mine. A fork meant for serious use should replace
those assets.

Marketing copy in the site (case studies, service descriptions, the
POTS landing prose) is technically code-adjacent (TSX strings) and
therefore covered by AGPL, but the same spirit applies: it's a
record of my business and my client's story, not a content template.
Lift the structure, not the content.
