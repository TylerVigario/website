# Deployment

How a tagged release on `main` becomes a running version on the prod
host. The contract is **artifact-based**: CI builds a self-contained
tarball, prod downloads it, verifies it, and swaps to it without ever
running `npm install`.

This is the source-side of the deploy contract. The prod-side script
that consumes it lives in the prod repo (`/usr/local/sbin/website-deploy`
on the Fedora host) and is owned by prod-Claude; this doc is what
informs that script.

The contract here is the same `schemaVersion: 2` shape that
[vis-daily-tracker](https://github.com/TylerVigario/vis-daily-tracker)
uses. Two apps that ship under the same prod deploy script means one
script, one rollback model, one mental model — the differences below
are minor field values (no Prisma, no CLI binary, no preStart), not a
different contract.

## What CI publishes

For every `v*` tag, the [release workflow](../.github/workflows/release.yml)
publishes a single GitHub Release with these assets:

| File | Purpose |
| --- | --- |
| `vigario-technology-solutions-v<X.Y.Z>.tar.gz` | Self-contained Next.js standalone bundle. |
| `SHA256SUMS` | Standard `sha256sum` output. Verify before extract. |

The tarball is built on `ubuntu-latest` (24.04, x64, glibc ~2.39) using
Node 24.x. Extracted contents drop directly into a versioned dir — no
`npm install`, no rebuild on the host.

The CI release flow creates the GitHub Release as a **draft**, attaches
both assets, then flips it to **published** in a second step. The
`release.published` webhook therefore only ever fires when both the
tarball and `SHA256SUMS` are uploaded — no fetch race.

### SHA256SUMS format

Standard `sha256sum` output:

```text
<64-char lowercase hex>  <filename>
```

Two spaces between hash and filename. Filename matches the tarball
asset name verbatim (and matches `BUILD_INFO.assetName`). Compatible
with `sha256sum --check SHA256SUMS` from the directory holding the
tarball.

## Tarball layout

```text
./
├── server.mjs                   # Custom entrypoint — graceful SIGTERM/SIGINT, drains in-flight, flushes Sentry, closes SQLite
├── server.js                    # Auto-generated Next.js standalone bootstrap (regenerated every build, not the entrypoint)
├── package.json                 # Traceability: deps + version that built this
├── MANIFEST                     # Deploy contract (JSON, see below)
├── BUILD_INFO                   # Build provenance (JSON, see below)
├── .env.example                 # Documents the runtime env contract (SQLITE_PATH + SMTP_* + SENTRY_*)
├── .next/
│   ├── server/                  # Standalone server bundle
│   └── static/                  # Static assets (already merged in)
├── public/                      # Public files (already merged in)
└── node_modules/
    └── better-sqlite3/          # Native sqlite binding (glibc-linked, NODE_MODULE_VERSION-pinned)
```

`better-sqlite3` (the only native dep the app uses at request time) is
picked up by Next's standalone tracer (declared as
`serverExternalPackages` in [next.config.ts](../next.config.ts) so it's
resolved at runtime rather than bundled into chunks). It's built against
Ubuntu 24.04 x64 glibc ~2.39 and is forward-compatible with newer glibc
on the same arch (Fedora 43/44).

There is **no Prisma**, **no CLI binary**, and **no preStart command**
in this artifact. The release workflow's analogues from vis-daily-tracker
(seed bundle, CLI manifest, prisma config) are deliberately absent
because nothing in this app needs them — schema lives entirely inside
[`src/lib/db.ts`](../src/lib/db.ts)'s `CREATE TABLE IF NOT EXISTS` and
runs lazily on first request.

## MANIFEST schema

```json
{
  "schemaVersion": 2,
  "tag": "v<X.Y.Z>",
  "startCommand": "node server.mjs",
  "preStartCommands": [],
  "port": 3000,
  "healthCheckPath": "/api/health",
  "requiredEnv": ["SQLITE_PATH"],
  "optionalEnv": [
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS",
    "SENTRY_DSN"
  ],
  "nodeVersion": "24",
  "requiredTools": {}
}
```

**Contract rules:**

- `schemaVersion` — refuse to deploy if it's a value prod doesn't
  understand. Bumping this is a breaking change for the prod-side
  script.
- `startCommand` — **authoritative**. Prod must read this value and
  `exec` it verbatim from the extracted bundle's root. It must not be
  hardcoded in prod's systemd unit — parameterize via a drop-in,
  wrapper script, or similar so source can change the entry point
  without editing prod. Within `schemaVersion: 2` the value is
  currently `node server.mjs`; that's a value, not a lock.
- `preStartCommands` — empty. Prod's deploy script must short-circuit
  on `length === 0` rather than spawning a no-op shell. Future migrations
  (e.g. moving to a non-IF-NOT-EXISTS schema model) would land here.
- `port` — **default** binding, not authoritative. Next.js standalone
  honors the `PORT` env var; if prod's env sets `PORT`, the app binds
  there instead. Health-checks and reverse-proxy routing should target
  `PORT` if set, falling back to `MANIFEST.port`.
- `healthCheckPath` — endpoint for post-swap liveness check. Optional;
  prod should default to `/` if the field is absent (older
  artifacts that predate the field). Currently `/api/health` —
  served by [`src/app/api/health/route.ts`](../src/app/api/health/route.ts),
  returns `200 {status: "ok"}` when the SQLite file is readable and
  `sqlite_schema` parses, `503` when not. Source can move this endpoint
  without an out-of-band prod change because prod reads the path from
  MANIFEST.
- `requiredEnv` — every name must be set with a non-empty value. App
  fails fast at startup via [`src/instrumentation.ts`](../src/instrumentation.ts)
  → [`src/lib/runtime-config.ts`](../src/lib/runtime-config.ts), which
  validates **all** required vars together (presence + format checks)
  and surfaces every misconfiguration in a single error. Server refuses
  to serve traffic if any check fails. The MANIFEST list is sourced
  from [`src/lib/required-env.json`](../src/lib/required-env.json) — the
  same file `runtime-config.ts` imports — so the deploy contract and
  the startup validator can never drift.
- `optionalEnv` — app silently degrades if missing:
  - `SMTP_*` — when both `SMTP_USER` and `SMTP_PASS` are set, quote /
    POTS-audit submissions trigger a notification email. Otherwise the
    submission lands in SQLite and the route handler logs `Failed to
    send email notification` (visible in the journal but does not fail
    the request).
  - `SENTRY_DSN` — when set, server-side errors and traces ship to
    Sentry. Otherwise [`src/sentry.server.config.ts`](../src/sentry.server.config.ts)
    skips init entirely. Build-time `NEXT_PUBLIC_SENTRY_DSN` (inlined
    into the client bundle) is intentionally not in `optionalEnv` because
    it's resolved at *build* time, not server start.
- `nodeVersion` — **optional**. The Node major version the artifact was
  built against and expects at runtime, as a bare string (`"24"`).
  Source emits the value from `package.json` `engines.node` so source,
  CI, and prod runtime all pin to the same major. **Format is strict** —
  only the bare major digit is accepted. `"24.x"`, `"v24"`, `"24.14.1"`,
  etc. are rejected; prod's matcher is a string-equality check on the
  major digit, not a semver parser. **Resolution on prod:** try
  `/usr/bin/node-<N>` first (Fedora's `nodejs<N>` parallel-install
  layout); fall back to the system default `node` if that versioned
  path doesn't exist. Either way, the resolved binary's `--version`
  major must equal this value — mismatch is a hard pre-swap failure.
  **Absent** → prod uses system default `node`; preflight matches
  against `BUILD_INFO.nodeVersion` major instead.
- `requiredTools` — empty object. Signals "considered, none" rather
  than "forgot the field." Prod's deploy script must treat `{}` the
  same as absent: no tools to verify, skip the preflight loop. (Older
  artifacts that predate the field also have no tools to verify.)

**Notes for the deploy script:**

- `SQLITE_PATH` must be an **absolute** path on a writable volume. The
  app throws on startup otherwise — see
  [`src/lib/runtime-config.ts`](../src/lib/runtime-config.ts). In
  production the file lives at `/opt/website/data/quotes.db` so it
  survives the release-dir swap; the deploy script must NOT bundle
  the data dir into a release.
- `SMTP_USER` is also the `From:` address on outbound notification
  email (the route handlers wrap it as `"VTS Website" <user>`). When
  rotating, update both halves in `/opt/website/.env` together.

## Why no Prisma / CLI / preStart

vis-daily-tracker's v2 contract carries `requiredTools: { prisma: ... }`
and runs `prisma migrate deploy` + `node bin/seed.js` as preStart
commands. This app needs none of that:

- **Schema** — there's one table (`quotes`) and it's created lazily on
  first request via `CREATE TABLE IF NOT EXISTS` inside
  [`src/lib/db.ts`](../src/lib/db.ts). No migration framework, no DDL
  drift.
- **Seeding** — there's nothing to seed. Reference rows would force
  the schema model to grow up; until then, `IF NOT EXISTS` is enough.
- **CLI** — admin operations (export submissions, prune old rows) are
  done by hand via the `sqlite3` REPL on the prod host. If/when an
  admin task becomes recurring, ship a CLI bundle following the
  vis-daily-tracker pattern (`bin/<name>.js` esbuild bundle,
  populate `MANIFEST.cli`).

If any of those three change, this section + the corresponding MANIFEST
fields move in lockstep — no `schemaVersion` bump needed for the *empty
→ populated* transition (per the v2 evolution rules below).

## BUILD_INFO schema

```json
{
  "tag": "v<X.Y.Z>",
  "commit": "<full git sha>",
  "buildTime": "<ISO 8601 UTC>",
  "nodeVersion": "v24.X.Y",
  "os": "ubuntu-24.04",
  "arch": "x86_64",
  "glibcVersion": "2.39",
  "assetName": "vigario-technology-solutions-v<X.Y.Z>.tar.gz"
}
```

`assetName` is the exact filename of the tarball asset on the GitHub
Release. Prod can use it directly instead of reconstructing the name
from `tag` — keeps the naming pattern from being a hidden contract.

**Major extraction.** When prod derives the Node major from
`BUILD_INFO.nodeVersion` for the backward-compat fallback (when
`MANIFEST.nodeVersion` is absent), strip the leading `v` and take the
integer before the first dot — `"v24.14.1"` → `"24"`.

**Pre-swap verification (recommended on prod):**

1. **Arch match** — prod `uname -m` must equal `BUILD_INFO.arch`. Hard
   fail if not.
2. **glibc forward compat** — prod's `ldd --version` must be ≥
   `BUILD_INFO.glibcVersion`. Hard fail if older — `better-sqlite3`'s
   native binding will fail to load.
3. **Node major match** — prod's resolved `node` (the binary it will
   `exec` per `MANIFEST.startCommand` + `MANIFEST.nodeVersion`) must
   report a `--version` major equal to `MANIFEST.nodeVersion` when
   present, falling back to `BUILD_INFO.nodeVersion` major for older
   artifacts that predate the field. Hard fail otherwise.
   `better-sqlite3` is the failure mode here: native modules are
   compiled per-major and `NODE_MODULE_VERSION` mismatch surfaces on
   the first request.

## Schema versioning

`MANIFEST.schemaVersion` is the contract handshake. Source and prod
upgrade in **lockstep** — there is no parallel support for older
schema versions.

When the schema bumps:

1. Source ships a release with the new `schemaVersion`.
2. Prod's deploy script is updated to handle the new schema before
   that release is deployed.
3. Prod hard-refuses any tarball whose `schemaVersion` it doesn't
   understand. No "warn and proceed" mode.

This keeps the contract simple at the cost of a coordinated source +
prod change.

Within a `schemaVersion`, evolution rules:

- **Adding optional fields**: allowed. Older prod scripts ignore them.
- **Adding required fields, removing fields, renaming fields,
  repurposing fields**: forbidden. That's a `schemaVersion` bump.
- **Changing the value of an existing field** (e.g. `startCommand`,
  `port`, `healthCheckPath`, `optionalEnv` list): allowed and expected.
  Prod is supposed to read these; that's the whole point.
- **Empty → populated for `preStartCommands`, `requiredTools`, `cli`**:
  allowed (they're already declared in v2; populating them is just a
  value change). The deploy script must treat empty as "skip", which
  it does.
- **Changing the *capability* an existing field requires from prod**:
  also a `schemaVersion` bump. Even if the field name and type stay
  the same, if the value now requires prod to have something it
  didn't before, prod's deploy script needs new logic.

### Version history

- **v1**: never shipped from this repo. Listed for cross-app
  consistency with vis-daily-tracker's history.
- **v2** (current): introduced from day one. `requiredTools` /
  `preStartCommands` / `cli` are all empty here but declared so prod's
  uniform schema-v2 handling matches across apps.

### Rollback compatibility

The "hard refuse unknown schemaVersion" rule applies to **new
deploys** of artifacts whose schema is *higher* than prod knows about.
**Rollbacks are different**: prod may need to roll back to an earlier
release on disk that carries an older `schemaVersion`. Refusing those
because they're "old" would leave prod stuck unable to roll back from
a bad release.

**Rollback support window:** prod's deploy script must accept rollback
to artifacts at `schemaVersion >= currentSchemaMax - 1`. Concretely
right now: current is v2; no v1 artifacts exist for this app, so the
window is single-version (v2 only). When v3 ships, prod accepts v3 +
v2; older becomes a "manual recovery" scenario.

## Recommended deploy flow

1. Webhook fires on `release.published` so deploy only triggers when
   the artifact is actually attached, not the bare tag.
2. Download tarball (use `BUILD_INFO.assetName` or construct from
   `tag`) + `SHA256SUMS`. Verify with `sha256sum --check SHA256SUMS` —
   abort on mismatch.
3. Extract to `releases/<tag>/`.
4. Read `MANIFEST` and `BUILD_INFO`. Run pre-swap checks above
   (schemaVersion known, arch match, glibc forward-compat, Node major
   match). Refuse to proceed on any failure.
5. **Required-tools preflight** — for every entry in
   `MANIFEST.requiredTools`, verify the tool is on `$PATH` and its
   `--version` satisfies the declared semver range. Empty object →
   skip the loop. Currently no-op for this app.
6. Run `MANIFEST.preStartCommands` from the extracted dir, with the
   union of `MANIFEST.requiredEnv` + `MANIFEST.optionalEnv` exported
   into the environment. Empty array → skip the step. Currently no-op.
7. Atomic symlink swap: `current → releases/<tag>/`.
8. Restart the service. The systemd unit must `exec`
   `MANIFEST.startCommand` with `cwd=current/` — parameterize via
   drop-in or wrapper, do not hardcode. When `MANIFEST.nodeVersion`
   is present, prefer the matching `/usr/bin/node-<N>` binary in the
   `ExecStart`; fall back to the system default `node` if that
   versioned path doesn't exist (preflight in step 4 hard-fails the
   deploy if the resolved binary's major doesn't match). Absent → use
   system default `node`.
9. Health-check `MANIFEST.healthCheckPath` (default `/`) on
   `PORT || MANIFEST.port`. Use `curl -fsS` with a short per-attempt
   timeout and a ~30s total budget. On failure, swap symlink back and
   restart.
10. Garbage collect: keep the last 5 releases.

## Shutdown contract

The standalone app handles `SIGTERM` and `SIGINT` gracefully. systemd's
default `KillSignal=SIGTERM` and `TimeoutStopSec=90s` are both correct
— no overrides needed in the unit file.

On signal, the app:

1. Stops accepting new connections (`server.close()` on the Next HTTP
   server). Idle keep-alive connections are closed immediately
   (`server.closeIdleConnections()`) so they don't hold the drain
   open — modern browsers keep them open for ages.
2. Drains in-flight requests, with a **30-second hard cap**. At the
   cap, `server.closeAllConnections()` force-cuts anything still
   running.
3. Closes the SQLite handle (`db.close()` on the
   [`src/lib/db.ts`](../src/lib/db.ts) singleton, which server.mjs
   reads off `globalThis.__sqlite__`). Forces the WAL checkpoint and
   surfaces close failures via the `[shutdown]` log lines instead of
   relying on process death.
4. `await Sentry.close(2000)` — flushes queued Sentry envelopes
   (2-second timeout) so error reports in flight at restart time
   aren't lost.
5. `process.exit(0)`.

A clean exit (0) means `systemctl stop` does NOT trigger
`OnFailure=systemd-failure-notify@%n.service`. With this contract,
that channel fires only on real failures (unhandled crashes, OOM,
runtime-config validation errors, etc.) — not once per deploy.

**Journalctl visibility.** The handler logs to stderr on entry and at
each phase. After a `systemctl stop` the journal should show:

```text
[shutdown] SIGTERM received: drain → sqlite → sentry → exit
[shutdown] closed idle keep-alive connections
[shutdown] in-flight requests drained
[shutdown] sqlite closed
[shutdown] sentry flushed
[shutdown] exit 0
```

If the 30-second cap fires (a request was still in flight when the
window closed), the `in-flight requests drained` line is replaced by
the cap warning, and the rest of the path proceeds normally:

```text
[shutdown] SIGTERM received: drain → sqlite → sentry → exit
[shutdown] closed idle keep-alive connections
[shutdown] drain hit 30s cap; force-closing in-flight connections
[shutdown] sqlite closed
[shutdown] sentry flushed
[shutdown] exit 0
```

These log strings are **illustrative, not normative.** The contract is
that journal lines exist for each phase, not their exact text.

The graceful-shutdown logic lives in [`server.mjs`](../server.mjs) at
the tarball root; it's the custom entrypoint that replaces direct
invocation of the auto-generated `server.js`.

## Failure modes worth handling explicitly

- **Tarball already extracted** (deploy retried) — `releases/<tag>/`
  exists. Re-running is idempotent: overwrite or skip extract, both
  safe.
- **Asset 404** — `release.published` fires only once both the tarball
  and `SHA256SUMS` are uploaded, so a 404 on either asset is a hard
  failure, not transient.
- **glibc mismatch** — don't try to `npm rebuild` on prod. The bundle
  has no `package-lock.json` resolution available. Hard fail and
  notify.
- **`SQLITE_PATH` missing or relative** — app throws at startup via
  `runtime-config.ts`; service won't come up. Pre-swap, validate the
  parent directory exists and is writable by the service user.
- **Unknown `schemaVersion`** — hard fail. Do not attempt to deploy
  with a fallback strategy.
- **`MANIFEST.nodeVersion` mismatch** — prod's resolved node binary
  reports a different major than the artifact declares. Hard fail at
  preflight. Operator must install the matching Node major before
  re-deploying. `better-sqlite3` is the failure mode: native modules
  are compiled per-major, loading them under the wrong Node major
  fails with a `NODE_MODULE_VERSION` mismatch on first request.

## Why this shape

Earlier, prod built from source on every tag (`git pull && npm ci &&
npm run build`). That worked but coupled prod's reliability to npm's
network reliability and made rollbacks slow (you had to rebuild the
old commit). The artifact pattern decouples build from deploy: CI
runs all the build risk once on a clean Ubuntu runner, prod just
verifies and swaps. Rollback is a symlink change.

The `MANIFEST` exists so prod's deploy script never has to read
source. Bumping the start command, adding a required env var, or
adding a pre-start step happens here, not by editing prod's systemd
unit. `schemaVersion` lets prod refuse a bundle whose contract it
doesn't understand instead of guessing.

The contract being shared between this app and vis-daily-tracker means
the prod deploy script is one script, exercised by every release of
either app — same pre-swap checks, same rollback semantics, same
shutdown contract. That's the point of the artifact pattern: ship the
app, not the deploy logic.
