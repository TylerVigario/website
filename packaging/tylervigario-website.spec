# tylervigario-website.spec
#
# Marketing site for Vigario Technology Solutions (VTS), Tyler Vigario's
# IT consultancy. Built on Next.js 16 with a custom server entrypoint
# (server.ts compiled to server.js by scripts/build-server.ts).
#
# Build model: rpmbuild itself drives the Next build inside %build.
# CI invokes `rpmbuild -ba` on a self-hosted runner on the prod host,
# so the resulting better-sqlite3 native binding matches the prod
# runtime's glibc exactly. The spec IS the build definition — no
# pre-built tarball.

%global         webuser   website
%global         webgroup  website

# Disable brp-mangle-shebangs. node_modules ships scripts with various
# shebangs (#!/usr/bin/env node, etc.) that are not our concern to police.
%global         __brp_mangle_shebangs %{nil}

# Skip Python bytecompilation BRP. node_modules occasionally ships .py
# helpers (gyp, etc.) that aren't intended for Fedora's pyc-compile pass.
%global         __brp_python_bytecompile %{nil}

# Skip strip BRP — better-sqlite3's .node binding ships with debug info
# that we want preserved for crash diagnosis.
%global         __strip /bin/true

# Disable debuginfo extraction entirely. find-debuginfo iterates over
# every ELF binary in the buildroot and dies on:
#   * @sentry/cli-linux-x64/bin/sentry-cli (no GNU build-id note —
#     it's a stripped Rust binary from upstream),
#   * better-sqlite3/build/Release/better_sqlite3.node (no DWARF info
#     in the precompiled prebuild we receive from npm).
# We don't own those binaries; we're not shipping debug symbols for
# code we didn't compile. The whole debuginfo subpackage concept
# doesn't apply to a JS app that vendors third-party prebuilds.
%global         debug_package %{nil}

Name:           tylervigario-website
Version:        %{?_version}%{!?_version:0.0.0}
Release:        1%{?dist}
Summary:        tylervigario.com — Vigario Technology Solutions marketing site

License:        Proprietary
URL:            https://github.com/TylerVigario/website
Source0:        %{name}-%{version}.tar.gz

# Arch-dependent: better-sqlite3 ships a native .node binding under
# node_modules/. The Linux x86_64 build is the only supported runtime
# (Fedora 43 + Node 24); other arches would need a parallel build
# pipeline. Declaring x86_64 (rather than noarch) makes the RPM
# honest about what it can run on and lets rpmbuild's BRP checks pass.
BuildArch:      x86_64

# Build deps — Node 24 (nodejs24-npm pulled transitively) to run
# `npm ci && npm run build`. systemd-rpm-macros for the
# %systemd_post/_preun/_postun expansions below.
BuildRequires:  nodejs24
BuildRequires:  nodejs24-npm
BuildRequires:  systemd-rpm-macros

# Runtime — pin the Fedora parallel-install nodejs24 package by exact
# name. The unversioned `nodejs` package on F43 is v22; a soft
# `nodejs >= 24` Requires would resolve in surprising ways. The
# service unit's ExecStart hardcodes /usr/bin/node-24 to match.
Requires:       nodejs24
Requires:       httpd
Requires:       mod_ssl
Requires(pre):  shadow-utils
Requires(post): systemd
Requires(post): policycoreutils-python-utils
Requires(preun): systemd
Requires(postun): systemd
Requires(postun): policycoreutils-python-utils

%description
Public marketing site for Vigario Technology Solutions (VTS), an
independent IT consultancy. Built on Next.js 16 (App Router) with a
custom server entrypoint, Tailwind v4, better-sqlite3 for form
submissions, nodemailer for optional notification email, and Sentry
for error + performance monitoring.

Ships:
  - Pre-built Next.js tree at /usr/share/tylervigario-website/
  - systemd service unit (tylervigario-website.service)
  - Apache vhost at /etc/httpd/conf.d/ (reverse-proxies to :3000)
  - tmpfiles.d for /var/lib + /var/cache state dirs
  - SELinux fcontext rules wired in %post
  - Env template at /etc/tylervigario-website/website.env

The 'website' system user is created on first install. SQLite state
lives at /var/lib/tylervigario-website/quotes.db; rebuild cache at
/var/cache/tylervigario-website/.


%prep
%setup -q


%build
# Run the website's own build pipeline.
#
# Do NOT export NODE_ENV=production before `npm ci`. npm treats
# NODE_ENV=production as implicit --omit=dev, which strips
# husky/tsx/eslint/typescript/etc. — but the package's `prepare`
# script unconditionally invokes `husky`, so the install dies with
# "husky: command not found" before the build ever starts. Next.js
# sets NODE_ENV=production itself for `next build`; the spec
# doesn't need to pre-set it.
#
# HUSKY=0 is the canonical husky-in-CI pattern (per husky's own
# README): the husky binary detects the env var, prints a notice,
# exits 0. The prepare script becomes a no-op without us having to
# patch package.json.
#
# NEXT_PUBLIC_SENTRY_DSN must be present at build time even if
# empty, otherwise scripts/check-public-env.ts fails the build.
# It's deliberately empty here — the build artifact ships with no
# baked-in Sentry DSN; the server-side DSN is set per-host via
# /etc/tylervigario-website/website.env.
export CI=true
export HUSKY=0
export NEXT_PUBLIC_SENTRY_DSN=

npm ci --prefer-offline --no-audit --no-fund
npm run build


%install
# App tree — everything the runtime needs lives under /usr/share/<pkg>/.
install -d %{buildroot}%{_datadir}/%{name}
cp -a server.js .next public node_modules package.json package-lock.json \
    %{buildroot}%{_datadir}/%{name}/

# Strip build-time cache and replace with a symlink into /var/cache.
# Next's incremental cache (ISR, image opt, fetch cache) writes to
# `.next/cache/` relative to the running app's cwd at runtime. The
# app tree under /usr/share is read-only at runtime (systemd
# ProtectSystem=strict). Without this symlink Next would try to
# write into a RO directory and silently degrade cache behavior.
# CacheDirectory= in the service unit creates /var/cache/<pkg> at
# 0750 website:website on activation, so the symlink target exists
# and is writable for the service user.
rm -rf %{buildroot}%{_datadir}/%{name}/.next/cache
ln -s /var/cache/%{name} %{buildroot}%{_datadir}/%{name}/.next/cache

# systemd unit
install -D -m 0644 packaging/%{name}.service \
    %{buildroot}%{_unitdir}/%{name}.service

# tmpfiles.d
install -D -m 0644 packaging/%{name}.tmpfiles.conf \
    %{buildroot}%{_tmpfilesdir}/%{name}.conf

# Apache vhost — RH-canonical drop-in path.
install -D -m 0644 packaging/%{name}-httpd.conf \
    %{buildroot}%{_sysconfdir}/httpd/conf.d/%{name}.conf

# Env file template — %config(noreplace), hand-managed thereafter.
install -d %{buildroot}%{_sysconfdir}/%{name}
install -m 0640 packaging/website.env.example \
    %{buildroot}%{_sysconfdir}/%{name}/website.env


%pre
getent group %{webgroup} >/dev/null || groupadd --system %{webgroup}
getent passwd %{webuser} >/dev/null || \
    useradd --system --gid %{webgroup} \
        --home-dir /var/lib/%{name} \
        --shell /sbin/nologin \
        --comment "%{name} service account" %{webuser}
exit 0


%post
# Apply tmpfiles.d immediately — don't wait for next boot.
systemd-tmpfiles --create %{_tmpfilesdir}/%{name}.conf || :

# SELinux fcontext rules. Idempotent on install ($1 == 1) only — on
# upgrade ($1 == 2) the rules are already there.
if [ "$1" -eq 1 ]; then
    semanage fcontext -a -t httpd_sys_content_t    "%{_datadir}/%{name}(/.*)?"  2>/dev/null || :
    semanage fcontext -a -t httpd_sys_rw_content_t "/var/lib/%{name}(/.*)?"     2>/dev/null || :
    semanage fcontext -a -t httpd_sys_rw_content_t "/var/cache/%{name}(/.*)?"   2>/dev/null || :
    semanage fcontext -a -t etc_t                  "%{_sysconfdir}/%{name}(/.*)?" 2>/dev/null || :
fi

# Always relabel — covers both fresh install and post-upgrade file replacement.
restorecon -R \
    %{_datadir}/%{name} \
    /var/lib/%{name} \
    /var/cache/%{name} \
    %{_sysconfdir}/%{name} 2>/dev/null || :

%systemd_post %{name}.service


%preun
%systemd_preun %{name}.service


%postun
%systemd_postun_with_restart %{name}.service

# Full uninstall ($1 == 0) only — preserve rules on upgrade.
if [ "$1" -eq 0 ]; then
    semanage fcontext -d "%{_datadir}/%{name}(/.*)?"   2>/dev/null || :
    semanage fcontext -d "/var/lib/%{name}(/.*)?"      2>/dev/null || :
    semanage fcontext -d "/var/cache/%{name}(/.*)?"    2>/dev/null || :
    semanage fcontext -d "%{_sysconfdir}/%{name}(/.*)?" 2>/dev/null || :
fi


%files
%doc README.md
%dir %{_datadir}/%{name}
%{_datadir}/%{name}/server.js
%{_datadir}/%{name}/.next
%{_datadir}/%{name}/public
%{_datadir}/%{name}/node_modules
%{_datadir}/%{name}/package.json
%{_datadir}/%{name}/package-lock.json
%{_unitdir}/%{name}.service
%{_tmpfilesdir}/%{name}.conf
%config(noreplace) %{_sysconfdir}/httpd/conf.d/%{name}.conf
%dir %{_sysconfdir}/%{name}
%config(noreplace) %attr(0640, root, %{webgroup}) %{_sysconfdir}/%{name}/website.env


%changelog
* Mon May 11 2026 Tyler Vigario <admin@tylervigario.com> - 0.0.0-1
- Initial package. Pilot of the app-RPM-as-artifact deploy model,
  replacing the prior build-on-prod contract. Build runs on a
  self-hosted GitHub Actions runner on the prod host so the
  better-sqlite3 native binding matches the production runtime's
  glibc exactly. Deploy = `sudo dnf upgrade %{name}`.
