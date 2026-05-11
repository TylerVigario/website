# Deployment

This doc is the source-side deploy contract. It describes what the
repository provides at a tagged commit, what the runtime environment
needs to host it, and the invariants production can rely on. How the
RPM is installed and rolled forward is a production-side concern and
is deliberately out of scope here.

## Model

**RPM-as-artifact.** A tagged commit on `main` is built by CI inside
a Fedora 43 container into a signed `tylervigario-website-<version>-1.fc43.noarch.rpm`,
uploaded to `repo.tylervigario.com`, and attached to the GitHub
Release. Production installs it with `sudo dnf upgrade
tylervigario-website`.

The prior contract (build-on-prod: production cloned the tagged
commit and ran `npm ci && npm run build`) had two structural
problems:

1. Build supply chain ran with prod's deploy-user privileges on every
   release — every transitive `postinstall` script executed against
   prod state.
2. The deploy critical path required GitHub + the npm registry to be
   reachable at deploy time. A registry outage stalled every host.

RPM-as-artifact moves the build into CI (one signed artifact, one
signature), uses dnf's existing trust + rollback machinery on prod
(`dnf history undo`, `dnf downgrade <version>`), and turns the deploy
into a one-line operator action with no upstream network dependency
at deploy time.

## Required runtime

| Requirement | Source of truth |
|---|---|
| Node major | RPM `Requires: nodejs24` — Fedora's parallel-install package; service unit's ExecStart hardcodes `/usr/bin/node-24` |
| systemd | RPM `Requires: systemd` (transitively via service unit) |
| Apache + mod_ssl | RPM `Requires: httpd mod_ssl` |
| SELinux policy | `policycoreutils-python-utils` for `semanage` |
| dnf repo trust | `server-admin-base` ships `/etc/pki/rpm-gpg/RPM-GPG-KEY-server-admin` + `/etc/yum.repos.d/server-admin.repo` |

The build-time native module (`better-sqlite3`) is compiled inside the
Fedora 43 CI container, so the shipped `.node` binding matches the
production runtime's glibc. Hosts running anything other than Fedora
43 are out of scope for this artifact.

## Required environment (per-host)

A file at `/etc/tylervigario-website/website.env` (the package ships a
template you edit in place; `%config(noreplace)` preserves your edits
across upgrades) must define:

| Variable | Notes |
|---|---|
| `HOSTNAME` | Default `127.0.0.1`. Apache reverse-proxies on the public side. |
| `PORT` | Default `3000`. |
| `SQLITE_PATH` | Must be absolute. Default `/var/lib/tylervigario-website/quotes.db`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional. Empty disables email sending. |
| `SENTRY_DSN` | Optional. Empty disables server-side Sentry. |

`src/lib/required-env.json` is the canonical list — `src/lib/runtime-config.ts`
validates it at app startup and fails fast if a required value is
missing. CI's `npm run build` exercises a hermetic smoke that catches
required-env drift before the build can become a release.

## What the RPM ships

| Path | Purpose |
|---|---|
| `/usr/share/tylervigario-website/server.js` | Custom Next.js entrypoint (compiled from `server.ts`). |
| `/usr/share/tylervigario-website/.next/` | Next build output. |
| `/usr/share/tylervigario-website/node_modules/` | Full production dependency tree (incl. better-sqlite3 native binding). |
| `/usr/share/tylervigario-website/public/` | Static assets. |
| `/usr/share/tylervigario-website/package.json` | Read by Node at startup. |
| `/usr/lib/systemd/system/tylervigario-website.service` | systemd unit. |
| `/usr/lib/tmpfiles.d/tylervigario-website.conf` | Owns `/var/lib/<pkg>` + `/var/cache/<pkg>` with 0750 website:website. |
| `/etc/httpd/conf.d/tylervigario-website.conf` | Apache vhost (reverse-proxy on :3000, redirect www→apex, HTTP→HTTPS). |
| `/etc/tylervigario-website/website.env` | Env template (`%config(noreplace)`, hand-edited per host). |

## Build

The `packaging/tylervigario-website.spec` file drives the build. CI
runs `rpmbuild -ba packaging/tylervigario-website.spec` inside a
Fedora 43 container; the spec's `%build` invokes the repo's own build
pipeline (`npm ci && npm run build`).

Build outputs preserved in the RPM:

- `server.js` (compiled by `scripts/build-server.ts` from `server.ts`)
- `.next/` (Next 16 standard build output — **not** `output: standalone`)
- `node_modules/` (devDeps included; see CLAUDE.md guardrails for why)
- `public/`
- `package.json`, `package-lock.json`

`.next/cache/` is stripped before packaging — Next regenerates it at
runtime under `/var/cache/tylervigario-website/` (via systemd
`CacheDirectory=`).

## Required `NEXT_PUBLIC_*` at build time

`scripts/check-public-env.ts` scans `src/` for `process.env.NEXT_PUBLIC_*`
references and fails the build if any required public env var is
missing or empty in the build-time environment. Optional public vars
(allowlisted inside the script — currently just
`NEXT_PUBLIC_SENTRY_DSN`) emit a warning instead.

The RPM build deliberately leaves `NEXT_PUBLIC_SENTRY_DSN` empty —
client-side Sentry is configured per-host via runtime env, not baked
into the build artifact.

## Signing

The RPM is signed with a long-lived signing subkey of the
`server-admin@tylervigario.com` master GPG key. The subkey expires
annually and is rotated through the same workflow that publishes it
to GitHub Actions secrets. The master key is offline; only the subkey
private material is reachable from CI.

Production hosts trust the public key via
`/etc/pki/rpm-gpg/RPM-GPG-KEY-server-admin`, shipped by
`server-admin-base`.

## Versioning + tagging

`workflow_dispatch` on the `release.yml` workflow is the sole release
entry point. The workflow:

1. Determines the next version via `git-cliff --bumped-version` (or
   the manually-supplied `bump` input).
2. Updates `package.json`, regenerates `CHANGELOG.md` + `RELEASE_NOTES.md`,
   commits `chore(release): v<version>`, tags, pushes.
3. Builds + signs the RPM, uploads to `repo.tylervigario.com`,
   refreshes `createrepo_c` metadata.
4. Creates the GitHub Release with the signed RPM attached.

Conventional Commits drives the version bump:

| Type | Bump |
|---|---|
| `feat` | minor |
| `fix`, `refactor` | patch |
| `docs`, `test`, `chore` | none (no release) |

## Production cycle (out-of-scope but for reference)

```bash
sudo dnf upgrade tylervigario-website
sudo systemctl status tylervigario-website
curl -sf https://tylervigario.com/api/health
```

Rollback:

```bash
sudo dnf downgrade tylervigario-website-<previous-version>
# or
sudo dnf history list tylervigario-website
sudo dnf history undo <id>
```
