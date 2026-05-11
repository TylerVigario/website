# Deployment

This doc is the source-side deploy contract. It describes what the
repository provides at a tagged commit, what the runtime environment
needs to host it, and the invariants production can rely on. How the
RPM is installed and rolled forward is a production-side concern and
is deliberately out of scope here.

## Model

**RPM-as-artifact.** A tagged commit on `main` is built by CI on a
self-hosted GitHub Actions runner on the repo host itself into a
signed `tylervigario-website-<version>-1.fc43.x86_64.rpm`, copied
into `/srv/dnf-repo/`, and attached to the GitHub Release.
Production installs it with `sudo dnf upgrade tylervigario-website`.

The self-hosted runner sidesteps the inbound-SSH dependency the
previous (Fedora-container + ssh-publish) shape required — GitHub
Actions can't reach the home server on port 22 from the internet,
and exposing it would be a magnet for scanners. The runner connects
outbound to GitHub for job pickup; publish is a local file move.

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

The build-time native module (`better-sqlite3`) is compiled on the
self-hosted runner — which IS the production host — so the shipped
`.node` binding matches the runtime glibc exactly. Hosts running
anything other than Fedora 43 are out of scope for this artifact.

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

The `packaging/tylervigario-website.spec` file drives the build. The
self-hosted runner invokes `rpmbuild -ba packaging/tylervigario-website.spec`
directly on the prod host; the spec's `%build` runs the repo's own
build pipeline (`npm ci && npm run build`).

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

The RPM is signed with a dedicated signing subkey (1-year expiration)
of the `server-admin@tylervigario.com` master GPG key. Master fingerprint:
`EC7FD18BBAFFA8A05AD0FC2ADE09D5ECD557FA4B`. The master lives in
`/etc/server-admin/gnupg/` on the repo host; only the subkey private
material is reachable from CI via `GPG_SIGNING_SUBKEY` (base64-encoded
ASCII-armored secret material, subkey-only via `gpg
--export-secret-subkeys <FPR>!`).

Consumers' rpm keyrings trust the master cert via
`/etc/pki/rpm-gpg/RPM-GPG-KEY-server-admin` (shipped by
`server-admin-base`). Signatures from any subkey of the trusted
master verify against that trust.

### Subkey rotation

When the subkey expires (or is being rotated proactively), three
locations need to stay in sync:

1. **The master keyring** (mint the new subkey):

   ```bash
   sudo gpg --homedir /etc/server-admin/gnupg --batch \
       --pinentry-mode loopback --passphrase '' \
       --quick-add-key EC7FD18BBAFFA8A05AD0FC2ADE09D5ECD557FA4B \
       rsa4096 sign 1y
   ```

2. **GitHub secret** (the new subkey private material):

   ```bash
   sudo gpg --homedir /etc/server-admin/gnupg --batch \
       --pinentry-mode loopback --passphrase '' --armor \
       --export-secret-subkeys "<NEW-SUBKEY-FPR>!" \
       | base64 -w0 \
       | gh secret set GPG_SIGNING_SUBKEY --repo TylerVigario/website
   ```

   The `!` is load-bearing — it forces the export to contain only that
   specific subkey, not cumulative material.

3. **Each consumer's rpm keyring** (refresh the trust cache):

   ```bash
   # On the repo host — refresh the served snapshot first
   sudo gpg --homedir /etc/server-admin/gnupg --export --armor \
       EC7FD18BBAFFA8A05AD0FC2ADE09D5ECD557FA4B \
       | sudo tee /srv/dnf-repo/RPM-GPG-KEY-server-admin >/dev/null
   sudo restorecon -F /srv/dnf-repo/RPM-GPG-KEY-server-admin

   # On every consumer (incl. the repo host itself):
   sudo rpm --import https://repo.tylervigario.com/RPM-GPG-KEY-server-admin
   ```

The symptom of skipping step 3 is `rpm -K <signed.rpm>` reporting
`digests SIGNATURES NOT OK` on RPMs signed by the new subkey — rpm's
keyring cached the master's subkey list at first-import time and
doesn't re-fetch when the snapshot file changes.

## Versioning + tagging

`workflow_dispatch` on the `release.yml` workflow is the sole release
entry point. The workflow:

1. Determines the next version via `git-cliff --bumped-version` (or
   the manually-supplied `bump` input).
2. Updates `package.json`, regenerates `CHANGELOG.md` + `RELEASE_NOTES.md`,
   commits `chore(release): v<version>`, tags, pushes.
3. Builds + signs the RPM on the self-hosted runner, copies it into
   `/srv/dnf-repo/`, refreshes `createrepo_c` metadata.
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
