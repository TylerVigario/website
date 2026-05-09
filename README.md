# Vigario Technology Solutions

Marketing front for Vigario Technology Solutions, but really this exists
because I needed somewhere for businesses panicking about POTS sunset to
land. Same artifact contract as
[vis-daily-tracker](https://github.com/TylerVigario/vis-daily-tracker) —
if I figured that out once, I'd rather not figure it out twice. The
contract itself lives in [docs/deployment.md](docs/deployment.md); read
that for anything past "how do I run it locally."

Stack: Next 16 (App Router, `output: "standalone"`), Tailwind v4,
better-sqlite3 for quote/audit submissions, nodemailer for the optional
"someone filled out a form" email, Sentry (`@sentry/nextjs`) for error +
performance monitoring (no-op when DSNs unset).

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
  db.ts                        # better-sqlite3 singleton on globalThis (server.mjs uses it on shutdown)
  runtime-config.ts            # validates required env at startup; fails fast before serving traffic
  required-env.json            # single source of truth — release.yml MANIFEST + runtime-config both read this
  api/                         # zod: QuoteRequest, PotsAuditRequest, ApiError
  services.tsx                 # service catalog (titles, blurbs, icons)
src/components/                # Nav, Hero, ContactForm, FadeIn, the usual
src/instrumentation.ts         # Next runtime hook: Sentry init + runtime-config validation at startup
src/instrumentation-client.ts  # Sentry browser init (replays-on-error, masked PII, extension-frame filter)
src/sentry.server.config.ts    # Sentry node-runtime init (loaded by instrumentation.ts)
src/sentry.edge.config.ts      # Sentry edge-runtime init (no edge handlers yet, wired anyway)
server.mjs                     # custom entrypoint — graceful SIGTERM, drain, sqlite close, Sentry flush
```

## Release

CI is `workflow_dispatch`-only — no auto-release on push, that's by
design. Trigger from the Actions tab. Two jobs in
[.github/workflows/release.yml](.github/workflows/release.yml):

- **Gate**: `npm ci` → typecheck → lint → format → build (with Sentry
  source-map upload when `SENTRY_AUTH_TOKEN` etc. are populated). First
  step cross-checks `NODE_VERSION` env, `.nvmrc`, and `engines.node` for
  major-version agreement. They must move together — the artifact
  declares one node major in MANIFEST, the runner used another to build
  it, drift is how you ship green and die at startup.
- **Release**: git-cliff bumps version (`feat→minor`, `fix/refactor→patch`,
  breaking→major; chore/docs/test/build/ci skip). Builds standalone,
  tars as `vigario-technology-solutions-vX.Y.Z.tar.gz` with
  `BUILD_INFO`, `MANIFEST` (schemaVersion 2), `SHA256SUMS`. Two-step
  publish: draft release with assets attached, then flip to published.
  Webhook fires on `release.published`, so prod never fetches before
  the tar lands.

The MANIFEST contract — what prod reads to deploy — is documented in
[docs/deployment.md](docs/deployment.md). That doc is the source of
truth; this README just links to it.

CHANGELOG is regenerated each release from commit messages — don't
hand-edit it. If the changelog reads wrong, fix the commit message
before tagging, or amend cliff.toml's parsers/grouping.

## Prod side (the Fedora box)

```text
/opt/website/
  releases/<tag>/          # immutable bundle, swappable
  current → releases/<tag> # systemd ExecStart follows the symlink
  data/                    # SQLite db lives HERE, outside releases. Never bundle it.
  .env                     # SQLITE_PATH=/opt/website/data/quotes.db, SMTP_*, SENTRY_DSN, prod-owned
```

Apache reverse-proxies to port 3000. Deploy script at
`/usr/local/sbin/website-deploy` listens for `release.published`,
verifies sha256, extracts, runs MANIFEST.preStartCommands (none for
us), starts service, hits `/api/health`, swaps `current`. Keeps last 5
releases. Pre-deploy backup is `sqlite3 quotes.db .backup` via
`admin-common.sh`.

`systemctl stop` is a clean exit 0 — server.mjs drains in-flight
requests (30s cap), closes the SQLite handle, flushes Sentry, then
exits. `OnFailure=systemd-failure-notify` only fires on real crashes,
not deploys.

## Things that have bitten me / will bite me again

- **Node major drift**. Bump `NODE_VERSION` env, `.nvmrc`, and
  `engines.node` in the same commit. The gate enforces it now but I'll
  forget at 11pm and try to bypass it.
- **better-sqlite3 native binding**. Recompiles against Node major
  during `npm ci` in CI. Bump Node major = new ABI in the artifact.
  Prod's `/usr/bin/node-<major>` must match `MANIFEST.nodeVersion`.
- **SQLITE_PATH must be absolute**. App throws at startup via
  runtime-config if unset or relative. No cwd fallback — that bit me
  when an old deploy wrote `data/quotes.db` inside a release dir that
  got nuked on the next swap.
- **Health check is `/api/health`**, not `/`. The homepage rendering
  200 just means React ran; `/api/health` actually opens the db.
- **Type-aware ESLint** (`recommendedTypeChecked`) is on. `req.json()`
  is `any`. Parse through a zod schema in `src/lib/api/`.
- **Sentry release identifier** is `vigario-technology-solutions@<version>`,
  pinned in next.config.ts. If you ever rename the package slug, that
  string moves with it (search the project — it's also referenced from
  the Sentry config files for traceability).
- **No tests yet**. If you add them, hook into the gate before lint.

## Domain

`vigario.tech` once DNS/SSL is sorted. For now it answers on
tylervigario.com.
