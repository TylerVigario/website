# Deployment

This doc is the source-side deploy contract. It describes what
the repository provides at a tagged commit, what the runtime
environment needs to host it, and the invariants the production
environment can rely on. How those pieces are assembled into a
running service is a production-side concern and is deliberately
out of scope here.

This contract mirrors `vis-daily-tracker/docs/deployment.md`. The
two source apps and the prod-side deploy script (`server-admin`)
are standardized on the same shape — diverging here means
diverging the deploy script, which isn't allowed.

## Model

**Build-on-prod.** The production environment clones a tagged
commit, runs `npm ci && npm run build`, and runs the resulting
bundle.

The prior contract (CI-built tarballs with `output: "standalone"`)
relied on Next's static-trace machinery to ship a minimized
`node_modules/`. Apps with custom server entrypoints, dynamic
requires, or CJS/ESM interop edges keep violating its
preconditions — that pattern produced four consecutive bad
releases in vis-daily-tracker (v2.80.0–v2.83.0). Build-on-prod
removes the translation step: the production host IS the
canonical environment, so npm picks optimal package variants for
the actual runtime, postinstall runs against the real environment,
and no compat preflight is needed.

## Required runtime

The host must have the following installed before any deploy can
succeed:

| Requirement | Source of truth |
|---|---|
| Node major | `package.json#engines.node` (currently `24.x`) |
| npm | bundled with Node |
| git | for `git clone` |

**Native-module policy.** Every package npm installs for the host
platform must ship a usable prebuilt binary — local compilation
cannot be a fallback. The host therefore doesn't need `make`,
`g++`, `python`, or `node-gyp` available. Currently the only
native dep is `better-sqlite3`, which ships prebuilt binaries for
Linux x64 + Node majors we target. Adding a dependency that
requires source compilation is a contract change and needs to be
coordinated with production before merge.

**Source repo access.** The deploy host needs read-only access to
clone tagged commits — an SSH deploy key registered on the GitHub
repo (preferred — narrowest scope, can be revoked without
affecting other access) or a fine-grained personal access token
scoped to this repo with `Contents: Read`. Credential
provisioning is a production-side concern. This contract
guarantees the clone URL stays at
`github.com/TylerVigario/website`; any change to it gets
reflected here.

**External-dependency uptime.** Build-on-prod puts GitHub and the
npm registry in the deploy critical path. If either is unreachable
at deploy time, `git clone` or `npm ci` fails and the deploy
aborts before any artifact swap — the same blast radius as a
`next build` failure: live service untouched, deploy retries when
the upstream recovers. Whether to mitigate via a local npm cache,
registry mirror, or git mirror is a production-side decision;
this contract acknowledges the dependencies and stops there.

**Supply-chain trust.** Build-on-prod runs every transitive
dependency's `preinstall`/`postinstall` script on the host as
part of `npm ci` — native-module setup, etc. Under the prior
CI-tarball contract, those scripts ran on the CI runner; under
build-on-prod, they run with whatever privileges the deploy user
has on the prod host. `npm ci --ignore-scripts` would defang this
but breaks `better-sqlite3` postinstall, so the mitigation lives
in how the deploy is invoked rather than in `npm` flags:
least-privilege deploy user, periodic `npm audit` discipline, and
the `package-lock.json` pinning already in place.

## What the repository provides

A tagged commit on `main` whose tree, after `npm ci && npm run build`,
contains:

| Path | Purpose |
|---|---|
| `package.json` | `engines.node`, `scripts.start`, `scripts.build`, `dependencies` / `devDependencies` |
| `package-lock.json` | Lockfile for deterministic `npm ci` |
| `src/lib/required-env.json` | The required-env contract. Imported by `src/lib/runtime-config.ts` for app-startup validation, so deploy-time and runtime checks stay in lockstep. |
| `server.js` (after build) | Custom entrypoint. Graceful SIGTERM/SIGINT handling — in-flight drain, SQLite close, Sentry flush, exit 0. |
| `.next/` (after build) | Next.js build output. |

## Build

`npm run build` runs the prebuild chain (`check:public-env`,
`build:server`), then `next build`, then a postbuild step that
real-boot smokes the just-built bundle.

**`check:public-env` is strict.** It scans `src/` for
`process.env.NEXT_PUBLIC_*` references and fails the build with a
non-zero exit if any required `NEXT_PUBLIC_*` variable is missing
or empty in the build-time environment. This converts the
"silently-baked-`undefined`-into-the-client-bundle" failure mode
into a loud build failure — by the time `next build` runs, every
required `NEXT_PUBLIC_*` is guaranteed present. Variables that are
intentionally optional (currently `NEXT_PUBLIC_SENTRY_DSN`) live
in an allowlist inside the script and only emit a warning. See
[`scripts/check-public-env.ts`](../scripts/check-public-env.ts).

Scope is `src/` only. `NEXT_PUBLIC_*` references in repo-root
files (`next.config.ts`, `server.ts`, build scripts) are out of
scope and rely on convention — the `NEXT_PUBLIC_*` pattern is
intended for client code that ends up in the bundle, not for
config-time reads.

**`build:server`** compiles `server.ts` → `server.js` at the
repo root via esbuild. `next`, `@sentry/*`, and `better-sqlite3`
stay external — the artifact's `node_modules/` ships them at
runtime. A `--check` smoke runs after the compile to catch
ERR_MODULE_NOT_FOUND at build time; the heavier real-boot smoke
runs in postbuild.

**The postbuild smoke** spawns `node server.js` on a random
loopback port with a hermetic stub environment, waits up to 30
seconds for the port to bind, sends SIGTERM, and asserts a clean
exit-0 within a further 10-second budget. The build fails if the
bundle doesn't bind within the bind window, exits non-zero, or
doesn't exit within the shutdown window.

**Hermetic stub environment.** Every required-env value is forced
regardless of what's inherited from `process.env`. The smoke
behaves the same locally, in CI, and on the deploy host during a
production build — there is no "stub when absent, real when
present" branching. Values are syntactically valid (they pass
[`src/lib/runtime-config.ts`](../src/lib/runtime-config.ts)
format and length validation) but never reach a real resource:

- `SQLITE_PATH` → a stub path inside `os.tmpdir()` that never gets opened. `src/lib/db.ts` opens lazily on first request, never at boot, so the smoke never touches it. The lazy-init is the load-bearing property here, not the file name (landmark's `db.smoke.invalid` leans on RFC 6761's reserved-unresolvable TLD because Prisma may init eagerly — different mechanism for a different DB).
- `SENTRY_DSN` → empty string. Sentry init becomes a no-op. The smoke does **not** exercise the Sentry transport path.
- `NODE_ENV` → `production`. Forces the production code path (no dev-mode error pages, no dev middleware) so the smoke validates what prod actually runs, not whatever the parent shell happens to inherit.

This is a deliberate departure from the more permissive "inherit
real env when present" pattern. The build smoke validates the
build artifact structurally; real-environment validation (real
SQLite path writeability, real Sentry transport, real SMTP) is
the production-side pre-swap smoke's responsibility. Two layers,
two failure surfaces, no overlap.

**Clean-exit assertion.** After the port binds, the smoke sends
SIGTERM and waits up to 10 seconds for the process to exit with
code 0. A non-zero exit, a signal-driven exit (where the handler
never called `process.exit(0)`), or no exit at all — any of these
fails the build. This catches the shutdown-handler-bug class —
uncaught throw, deadlocked drain, never-resolving promise — that
would otherwise pass a bind-only smoke and produce
SIGKILL-on-deploy noise in production
(`OnFailure=systemd-failure-notify@%n.service` going off every
deploy because shutdown didn't reach exit 0).

**What the build smoke catches:** module resolution failures,
ESM/CJS interop errors, runtime-config.ts validation, startup
import-graph errors, `listen()` succeeding, and the shutdown
handler running cleanly to exit 0.

**What the build smoke does NOT catch:** real SQLite path
writeability, real Sentry transport (DSN forced empty), real
SMTP, the actual filesystem layout, or the real env shape from
the production secret store. Those belong to the production-side
pre-swap smoke, which runs the same bundle against the real
environment and is strictly complementary.

## Start

`npm start` invokes whatever `package.json#scripts.start` resolves
to (currently `node server.js`). The entrypoint binds `PORT`
(default `3000`) on `HOSTNAME` (default `127.0.0.1`). The
loopback default is safe-by-default: a deploy that comes up
without an explicit `HOSTNAME` override is reachable only through
the local reverse proxy, never the LAN or WAN. Production exposes
the service by overriding `HOSTNAME=0.0.0.0` (or a specific
interface) in its env file.

## Environment variables

Build-on-prod merges the previously-distinct CI-build and
production-runtime phases. Some variables matter at build time
(baked into the client bundle by Next, or consumed by Next's
build plugins). Some matter only at runtime. The deploy script
needs to source the correct set for the correct phase — failing
to source a build-time var doesn't produce an obvious error at
deploy time, just silently degraded behavior in the running
service.

### Runtime required

The single canonical list lives at
[`src/lib/required-env.json`](../src/lib/required-env.json).
Currently:

```json
["SQLITE_PATH"]
```

The app refuses to start if any are missing or fail format/length
validation in
[`src/lib/runtime-config.ts`](../src/lib/runtime-config.ts).

Notes for the deploy environment:

- `SQLITE_PATH` must be an absolute path on a writable volume. The app throws on startup otherwise. Store the SQLite file outside any release directory so the data survives release swaps (e.g. `/opt/website/data/quotes.db`).

### Runtime optional

The app silently degrades when these are missing (SMTP and
Sentry transport unavailable):

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SENTRY_DSN
```

When `SMTP_USER` and `SMTP_PASS` are both set, the quote and
POTS-audit routes send notification emails on each submission.
When unset, submissions are saved to SQLite but no email is sent.

### Build + runtime

`NEXT_PUBLIC_*` variables are baked into the client JavaScript
bundle by `next build` AND remain available to server code at
runtime. They need to be set when `npm run build` runs; setting
them only at runtime is too late — the client bundle is already
shipped without them.

```text
NEXT_PUBLIC_SENTRY_DSN   (optional — Sentry SDK no-ops if absent)
```

The `check:public-env` step in the prebuild chain enforces this:
required `NEXT_PUBLIC_*` variables that are referenced in `src/`
but absent from the build-time environment fail the build loudly.
Optional `NEXT_PUBLIC_*` variables (allowlisted inside the check
script) emit a warning instead.

### Build-time only (optional)

Sentry source-map upload runs as part of `next build` via
`@sentry/nextjs`'s plugin. The upload is **optional**: if these
three are present, source maps upload to Sentry and production
stack traces resolve back to readable TypeScript; if absent,
upload is skipped and the build succeeds anyway (stack traces in
Sentry stay minified):

```text
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

These are write-scoped credentials used only during build — they
must be available when `npm run build` runs but are not read by
the running service. The deploy script may keep them in the same
env file as runtime vars; they just don't need to be exported
into the systemd unit's runtime environment.

## Health endpoint

`GET /api/health` returns `200 {"status":"ok"}` when the SQLite
file is openable and the schema parses, `503` when not. Served by
[`src/app/api/health/route.ts`](../src/app/api/health/route.ts).

The path is hardcoded in this contract. Any change to it gets
reflected here.

## Database

SQLite, initialized lazily on first request by
[`src/lib/db.ts`](../src/lib/db.ts). No migrations to run at
deploy time — the schema is created via `CREATE TABLE IF NOT EXISTS`
inside `getDb()`. Schema changes that aren't backward-compatible
with existing data are a contract issue that needs to be handled
with intent (additive columns are safe; renames/drops are not).

**Backup.** The SQLite file at `SQLITE_PATH` is the only stateful
artifact this service owns. Production should snapshot it before
each deploy (`sqlite3 quotes.db .backup snapshot.db`); the
mechanics are production-side.

## Shutdown contract

`server.js` handles `SIGTERM` and `SIGINT` gracefully. systemd's
default `KillSignal=SIGTERM` and `TimeoutStopSec=90s` are both
correct for this contract.

On signal, the app:

1. Stops accepting new connections via `server.close()`. Idle keep-alive connections are closed immediately (`server.closeIdleConnections()`).
2. Drains in-flight HTTP requests with a **30-second hard cap**. At the cap, `server.closeAllConnections()` force-cuts anything still running.
3. Closes the better-sqlite3 handle (`db.close()`) — forces a WAL checkpoint.
4. `await Sentry.close(2000)`.
5. `process.exit(0)`.

**Sentry default import is load-bearing.** `server.ts` uses
`import Sentry from "@sentry/nextjs"`, not the namespace form
`import * as Sentry from`. The namespace form silently lacks
`Sentry.close` under the CJS-via-ESM-namespace shape that
`@sentry/nextjs` ships; a deploy with the wrong form would skip
the Sentry flush on every shutdown without erroring.

**The failure-notify channel becomes diagnostic.** A clean exit 0
means `systemctl stop` does NOT trigger
`OnFailure=systemd-failure-notify@%n.service`. With this contract,
that channel fires only on real failures — unhandled crashes,
OOM, runtime-config validation errors, shutdown handler bugs that
hit `TimeoutStopSec` and get SIGKILLed (exit 137).

**Journalctl visibility.** The handler logs to stderr at each
phase:

```text
[shutdown] SIGTERM received: drain → sqlite → sentry → exit
[shutdown] closed idle keep-alive connections
[shutdown] in-flight requests drained
[shutdown] sqlite closed
[shutdown] sentry flushed
[shutdown] exit 0
```

If the 30-second drain cap fires, `in-flight requests drained` is
replaced by a cap-fired warning. The lines are positive proof the
path ran — the absence of a failure-notify email alone is a weak
signal.

These log strings are illustrative, not normative. The contract
is that journal lines exist for each phase, not their exact text.

**In-flight ceiling.** The 30-second drain cap is the upper bound
on how long a single in-flight request can hold up shutdown. The
quote/POTS-audit routes are small JSON POSTs that complete in
well under a second; the cap exists for the SMTP send path
(nodemailer can hang on slow SMTP servers). Tunable in
`server.ts`.

## What's not in this doc

These belong to the production environment:

- Deploy trigger (webhook, operator command, etc.)
- Webhook signature verification, deploy locking, disk pre-checks
- Release directory layout and retention
- SQLite snapshot/backup strategy before deploys
- Pre-swap smoke against the real environment (the build's postbuild smoke is build-time-only with hermetic stub env)
- Atomic symlink swap mechanics
- Post-swap health check and rollback
- Failed-deploy markers
- systemd unit definition

This contract describes what the repository provides and what the
host needs. The production environment decides how to assemble
those into a running service.
