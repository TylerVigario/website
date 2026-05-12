# Vigario Technology Solutions

Marketing front for Vigario Technology Solutions, but really this exists
because I needed somewhere for businesses panicking about POTS sunset to
land. Deploys as a signed RPM (`tylervigario-website`) to the private
LAN-only dnf repo at `http://repo.lan/`; prod installs with `sudo dnf
--refresh upgrade tylervigario-website`. The full contract lives in
[docs/deployment.md](docs/deployment.md); the spec is at
[packaging/tylervigario-website.spec](packaging/tylervigario-website.spec).
Read those for anything past "how do I run it locally."

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

**RPM-as-artifact.** CI builds and signs the RPM on a self-hosted
GitHub Actions runner running on the prod host itself, lands it in
the private LAN-only dnf repo, attaches it to the GitHub Release.
Production installs via `sudo dnf --refresh upgrade tylervigario-website`.
See [docs/deployment.md](docs/deployment.md) for the full contract.

`.github/workflows/release.yml`:

- **Gate** (runs on PR + push to main + dispatch): `npm ci` →
  typecheck → lint → format → test → build (with the real-boot
  postbuild smoke against the just-built server.js). First step
  cross-checks three of the five Node-major pins (`NODE_VERSION`
  env, `.nvmrc`, `engines.node`).
- **Release** (dispatch only): git-cliff bumps version
  (`feat→minor`, `fix/refactor→patch`, breaking→major;
  chore/docs/test skip), annotated-tags, then builds + `sudo rpmsign`s
  the RPM on the self-hosted runner, copies into
  `/srv/dnf-repo-private/` (LAN-only, served at `http://repo.lan/`),
  attaches the signed RPM to the GitHub Release.

CHANGELOG is regenerated each release from commit messages — don't
hand-edit it. If the changelog reads wrong, fix the commit message
before tagging, or amend cliff.toml's parsers/grouping.

## Prod side (the Fedora box)

```text
/usr/share/tylervigario-website/      # app tree (owned by RPM, read-only)
  server.js                            # compiled custom entrypoint
  .next/                               # Next build output
  node_modules/                        # full prod dep tree, incl. better-sqlite3 native binding
  public/
  package.json
/usr/lib/systemd/system/tylervigario-website.service   # systemd unit
/etc/httpd/conf.d/tylervigario-website.conf            # Apache vhost (proxy → :3000)
/etc/sysconfig/tylervigario-website                    # env (%config noreplace, hand-edited)
/var/lib/tylervigario-website/quotes.db                # SQLite, StateDirectory, website:website
/var/cache/tylervigario-website/                       # Next runtime cache
```

Deploy: `sudo dnf --refresh upgrade tylervigario-website`. Rollback:
`sudo dnf downgrade tylervigario-website-<previous>` or `dnf history
undo <id>`. No webhook, no path units, no build-on-host — the RPM
ships pre-built, validated, signed.

Apache reverse-proxies to port 3000. Server binds `127.0.0.1` by
default — Apache fronts on :443. SQLite handle, in-flight drain,
Sentry flush, `systemd-failure-notify@%n` on crash — same as before,
all in the systemd unit now (`packaging/tylervigario-website.service`).

## Things that have bitten me / will bite me again

- **Node major drift**. Bump `NODE_VERSION` env, `.nvmrc`,
  `engines.node`, the spec's `Requires: nodejs<N>`, and the unit's
  `ExecStart=/usr/bin/node-<N>` together. The gate enforces the first
  three; the spec and unit have to move manually in lockstep.
- **better-sqlite3 native binding**. The `.node` file compiles during
  `npm ci` on the self-hosted runner (which IS the prod host) and
  ships pre-built in the RPM. Bump Node major = ABI change → rebuild
  in CI; prod just `dnf upgrade`s. The five Node-major pins above all
  have to move together.
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
