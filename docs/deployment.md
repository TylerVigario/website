# Deployment

This is the source-side deploy contract: what the repository provides
at a tagged commit, what the runtime needs, and the invariants
production can rely on. Operating the deployed service (cutover,
rollback, fleet management) is out of scope here.

## Model

**RPM-as-artifact.** A tagged commit on `main` is built by CI on a
self-hosted GitHub Actions runner (running on the prod host) into a
signed `tylervigario-website-<version>-1.fc43.x86_64.rpm`, copied
into `/srv/dnf-repo-private/` (served at `http://repo.lan/`, LAN-only),
and attached to the GitHub Release. Production installs it with
`sudo dnf --refresh upgrade tylervigario-website`.

`tylervigario-website` is a **private** package — it doesn't go to
`https://repo.tylervigario.com/` (the public-facing endpoint reserved
for shareable third-party packaging Tyler eventually weeds out).

The self-hosted runner sidesteps the GitHub→prod inbound network
problem. The runner connects outbound to GitHub for job pickup;
publish is a local file move into the dnf repo dir. No inbound
SSH or HTTPS to the home server is required.

## RPM dependencies

Declared by `packaging/tylervigario-website.spec`'s `Requires:`:

| Package | Why |
|---|---|
| `nodejs24` | Runtime. Service unit's `ExecStart` is `/usr/bin/node-24` — the parallel-install package's versioned binary, not the unversioned `node`. |
| `httpd`, `mod_ssl` | Apache reverse-proxies `:443` → `:3000`. |
| `systemd` | Service unit + `%systemd_post/_preun/_postun` macros (pulled transitively). |
| `shadow-utils` | `%pre` creates the `website` system user. |

No SELinux fcontext rules ship with the package. Apache reverse-proxies
to `:3000` over TCP, so the default labels on the RPM-owned paths
(`usr_t`, `var_lib_t`, `var_cache_t`, `etc_t`) are sufficient — there's
nothing for the web user to read off-tree that would need its own
label. (Earlier iterations carried `policycoreutils-python-utils` +
`semanage` rules in `%post`/`%postun`; they implied Apache reads the
file tree directly, which it doesn't, and got dropped.)

## Infrastructure prerequisite

The host must already be subscribed to the private dnf repo
(`http://repo.lan/`) with the signing key trusted. Bootstrap:

```bash
sudo rpm --import http://repo.lan/RPM-GPG-KEY-server-admin
sudo curl -fsSLo /etc/yum.repos.d/server-admin-private.repo \
    http://repo.lan/server-admin-private.repo
```

Both `.repo` file and pubkey are served as static files from the repo
itself (not packaged) to avoid the bootstrap chicken-and-egg of
installing a package to discover where to install packages from.

## Per-host runtime environment

`/etc/sysconfig/tylervigario-website` ships as `%config(noreplace)`
— first install lays down a template; subsequent upgrades preserve
your edits. Required keys (validated at startup by
`src/lib/runtime-config.ts` against `src/lib/required-env.json`):

| Variable | Notes |
|---|---|
| `HOSTNAME` | Default `127.0.0.1`. Apache fronts on `:443`. |
| `PORT` | Default `3000`. |
| `SQLITE_PATH` | Must be absolute. Default `/var/lib/tylervigario-website/quotes.db` (state dir owned by `website:website`, 0750). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional. Empty disables email notifications on form submission. |
| `SENTRY_DSN` | Optional. Empty disables server-side Sentry. |

CI's `npm run build` exercises a hermetic smoke against the
required-env contract — drift between `src/lib/required-env.json`
and `runtime-config.ts` fails the build before it can become a
release.

## What the RPM ships

| Path | Mode | Purpose |
|---|---|---|
| `/usr/share/tylervigario-website/server.js` | 0644 | Custom Next.js entrypoint (compiled from `server.ts`). |
| `/usr/share/tylervigario-website/.next/` | 0755 | Next build output. |
| `/usr/share/tylervigario-website/.next/cache` | symlink | → `/var/cache/tylervigario-website/`. Next's runtime cache writes redirected into a writable, systemd-managed dir. |
| `/usr/share/tylervigario-website/node_modules/` | 0755 | Full prod dep tree incl. better-sqlite3 native binding. |
| `/usr/share/tylervigario-website/public/` | 0755 | Static assets. |
| `/usr/share/tylervigario-website/package.json` | 0644 | Read by Node at startup. |
| `/usr/lib/systemd/system/tylervigario-website.service` | 0644 | systemd unit. |
| `/usr/lib/tmpfiles.d/tylervigario-website.conf` | 0644 | Owns `/var/lib/<pkg>` + `/var/cache/<pkg>` at 0750 website:website. |
| `/etc/httpd/conf.d/tylervigario-website.conf` | `%config(noreplace)` | Apache vhost (reverse-proxy on :3000, redirect www→apex, HTTP→HTTPS). |
| `/etc/sysconfig/tylervigario-website` | `%config(noreplace) 0640 root:website` | Env template (see above) — RH-canonical home for a single-file systemd EnvironmentFile. |

Created at runtime by the service unit (not in the RPM):
`/var/lib/tylervigario-website/` (StateDirectory) and
`/var/cache/tylervigario-website/` (CacheDirectory). The
`.next/cache` symlink resolves through here.

## Build

`packaging/tylervigario-website.spec` drives the build. The
self-hosted runner invokes `rpmbuild -ba` directly on the prod host
— the spec's `%build` runs `npm ci && npm run build` (which also
exercises `scripts/build-server.ts` and `scripts/postbuild.ts`'s
real-boot smoke).

Because the runner IS Fedora 43 on x86_64, the native
`better-sqlite3.node` binding the RPM ships matches the runtime
glibc exactly. Hosts running anything else are out of scope.

The build is `BuildArch: x86_64` (not `noarch`) for the same reason
— the bundled native binding makes the whole RPM arch-dependent.

## Required `NEXT_PUBLIC_*` at build time

`scripts/check-public-env.ts` scans `src/` for `process.env.NEXT_PUBLIC_*`
references and fails the build if any required public env var is
missing or empty in the build-time environment. Optional public
vars (allowlisted in the script — currently just
`NEXT_PUBLIC_SENTRY_DSN`) emit a warning instead.

The RPM build deliberately leaves `NEXT_PUBLIC_SENTRY_DSN` empty.
Client-side Sentry DSN is configured per-host at runtime via
`/etc/sysconfig/tylervigario-website`, not baked into the build.

## Signing

Two signing subkeys live on the prod host's master keyring at
`/etc/server-admin/gnupg/` (root-only). Master fingerprint:
`EC7FD18BBAFFA8A05AD0FC2ADE09D5ECD557FA4B`.

| Subkey | Used by |
|---|---|
| **private-signer** | All private packages (this one, dailies, turf-tracker, server-admin-*). Bound via `/root/.rpmmacros`'s `%_gpg_name`. |
| **public-signer** | Public-facing packages — third-party packaging Tyler weeds out for sharing. Not used by this RPM. |

Both cross-signed by the master, so `RPM-GPG-KEY-server-admin` (the
pubkey snapshot consumers import) validates signatures from either.
Revoking one doesn't affect the other.

`github-runner` (the self-hosted Actions runner's system user) has
zero key material. The workflow calls `sudo /usr/bin/rpmsign --addsign`
via a narrow sudoers rule at `/etc/sudoers.d/github-runner-rpmsign`
(operator-managed on prod, not shipped by this package). The rule
scopes to RPMs under `/var/lib/github-runner/runner/_work/*/*/rpmbuild/RPMS/x86_64/*.rpm`.
Actual signing runs as root, which reads `/root/.rpmmacros` (bound to
private-signer's fingerprint). Compromise scope of `github-runner`
is "can sign an RPM at the sudoers-allowed path," not "can take the
subkey elsewhere."

### Subkey rotation

When a subkey expires (or rotates proactively), three updates keep
consumers verifying. Skip any one and `rpm -K` reports
`digests SIGNATURES NOT OK` on RPMs signed by the new subkey.

1. **Master keyring** — mint the new subkey:

   ```bash
   sudo gpg --homedir /etc/server-admin/gnupg --batch \
       --pinentry-mode loopback --passphrase '' \
       --quick-add-key EC7FD18BBAFFA8A05AD0FC2ADE09D5ECD557FA4B \
       rsa4096 sign 1y
   ```

2. **prod's `/root/.rpmmacros`** — bind `%_gpg_name` to the new
   subkey's fingerprint. (Only if rotating private-signer. For
   public-signer, the equivalent binding lives in whatever workflow
   signs public packages.)

3. **Pubkey snapshots + consumer rpm keyrings** — refresh:

   ```bash
   # Repo host: refresh both served pubkey snapshots
   sudo gpg --homedir /etc/server-admin/gnupg --export --armor \
       EC7FD18BBAFFA8A05AD0FC2ADE09D5ECD557FA4B > /tmp/pubkey.asc
   sudo install -m 0644 -o apache -g apache /tmp/pubkey.asc \
       /srv/dnf-repo-public/RPM-GPG-KEY-server-admin
   sudo install -m 0644 -o apache -g apache /tmp/pubkey.asc \
       /srv/dnf-repo-private/RPM-GPG-KEY-server-admin
   sudo restorecon -F /srv/dnf-repo-{public,private}/RPM-GPG-KEY-server-admin
   sudo shred -u /tmp/pubkey.asc

   # Every consumer (incl. the repo host):
   sudo rpm --import http://repo.lan/RPM-GPG-KEY-server-admin
   ```

rpm's `gpg-pubkey-<master-fpr>` entry caches the master's subkey
list at first-import time; it doesn't re-fetch when the snapshot
file changes. Hence the explicit re-import.

## Versioning + tagging

`workflow_dispatch` on `release.yml` is the sole release entry
point. The workflow:

1. Determines the next version via `git-cliff --bumped-version` (or
   the `bump` workflow input).
2. Updates `package.json`, regenerates `CHANGELOG.md` +
   `RELEASE_NOTES.md`, commits `chore(release): v<version>`,
   annotated-tags, pushes.
3. Builds + signs the RPM on the self-hosted runner (sign via `sudo
   rpmsign`; private-signer subkey on prod's keyring), copies it into
   `/srv/dnf-repo-private/`, runs `createrepo_c --update`.
4. Creates the GitHub Release with the signed RPM attached.

Conventional Commits drives the bump magnitude:

| Type | Bump |
|---|---|
| `feat` | minor |
| `fix`, `refactor` | patch |
| `docs`, `test`, `chore` | none (no release) |

Dispatching with no releasable commits since the last tag is a no-op
— git-cliff says "nothing to bump" and the workflow's
`tag-already-exists` guard refuses. Force a bump by landing at
least one `fix`/`feat`/`refactor` commit first; the `bump` input
selects magnitude, not whether to bump.

## Production cycle

Reference, not contract:

```bash
sudo dnf upgrade --refresh tylervigario-website
sudo systemctl status tylervigario-website
curl -sf https://tylervigario.com/api/health
```

`--refresh` invalidates dnf's cached repo metadata so a just-published
version is visible immediately.

Rollback:

```bash
sudo dnf downgrade tylervigario-website-<previous-version>
# or
sudo dnf history list tylervigario-website
sudo dnf history undo <id>
```
