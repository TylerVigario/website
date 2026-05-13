# vigario-website.spec
#
# Marketing site for Vigario Technology Solutions (VTS), Tyler Vigario's
# IT consultancy. Built on Next.js 16 with a custom server entrypoint
# (server.ts compiled to server.js by scripts/build-server.ts).
#
# Build model: rpmbuild itself drives the Next build inside %%build.
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

# Disable debuginfo extraction. find-debuginfo iterates over every
# ELF in the buildroot and dies on:
#   * @sentry/cli-linux-x64/bin/sentry-cli (no GNU build-id note —
#     stripped Rust binary from upstream),
#   * better-sqlite3/build/Release/better_sqlite3.node (no DWARF info
#     in the precompiled prebuild we receive from npm).
# We don't own those binaries; nothing to debug-package. Skipping the
# whole debuginfo subpackage concept fits a JS app that vendors
# third-party prebuilds.
%global         debug_package %{nil}

# Skip the strip BRP for the same reason: we don't build native
# binaries locally, only vendor prebuilt ones. Stripping is a no-op
# on stripped-upstream files and would just churn timestamps.
%global         __strip /bin/true

# Drop the RPM payload compression from the Fedora default
# (w19.zstdio — zstd at max level) to w7.zstdio. The default is
# tuned for distro-scale bandwidth + mirror storage; we publish to
# a LAN-only private repo serving one host. For a tree of mostly
# JS, w7 is ~5x faster to compress and ~2-5% larger on disk — the
# few MB hit is invisible against the dispatch frequency and
# download surface of a private repo. Package-local override
# (%%global, not /etc/rpm/macros) so no leakage to other packages
# that haven't measured this trade-off.
%global         _binary_payload w7.zstdio

Name:           vigario-website
Version:        %{?_version}%{!?_version:0.0.0}
Release:        1%{?dist}
Summary:        tylervigario.com — Vigario Technology Solutions marketing site

License:        AGPL-3.0-or-later
URL:            https://github.com/TylerVigario/website
Source0:        %{name}-%{version}.tar.gz
# Source1 is the sysusers.d snippet, copied into rpmbuild/SOURCES/ by
# the workflow alongside the source tarball. The sysusers_create_package
# macro (called in pre below) reads it at build time and inlines the
# content into the pre scriptlet.
Source1:        %{name}.sysusers

# Arch-dependent: better-sqlite3 ships a native .node binding under
# node_modules/. The Linux x86_64 build is the only supported runtime
# (Fedora 43 + Node 24); other arches would need a parallel build
# pipeline. Declaring x86_64 (rather than noarch) makes the RPM
# honest about what it can run on and lets rpmbuild's BRP checks pass.
BuildArch:      x86_64

# Build deps. Node 24 + npm to run npm ci + next build.
# systemd-rpm-macros provides the systemd_post / preun / postun
# scriptlet helpers expanded below. (Comments here avoid leading
# `%` on macro names because rpm's macro engine expands % even
# inside comments unless escaped with %%.)
BuildRequires:  nodejs24
BuildRequires:  nodejs24-npm
BuildRequires:  systemd-rpm-macros

# Runtime — pin the Fedora parallel-install nodejs24 package by exact
# name. The unversioned `nodejs` package on F43 is v22; a soft
# `nodejs >= 24` Requires would resolve in surprising ways. The
# service unit's ExecStart hardcodes /usr/bin/node-24 to match.
Requires:       nodejs24
# %%pre uses systemd-sysusers (via %%sysusers_create_package); the
# other three scriptlet phases use %%systemd_post/_preun/_postun.
# All four expand into calls against binaries from the systemd
# package — declare each explicitly. Implicit on every Fedora install,
# but the orthodox declaration documents intent.
Requires(pre):  systemd
Requires(post): systemd
Requires(preun): systemd
Requires(postun): systemd
# Apache (or any reverse proxy) and TLS are operator concerns —
# the package ships an Apache snippet at /usr/share/<pkg>/ that
# operators can Include from their own vhost, but doesn't dictate
# that Apache is the proxy. shadow-utils similarly: the sysusers.d
# snippet means systemd-sysusers creates the user, no useradd needed.

# Package rename: the previous name was tylervigario-website. Hosts
# upgrading from any v1.4.x release pick this up as a transactional
# supersede — dnf stops + disables the old service via the old
# package's %%systemd_preun, removes the old files, and installs the
# new ones in a single transaction. Without these two lines dnf would
# happily leave both packages installed alongside each other, with
# two systemd units both ready to bind :3000 (first one started wins,
# second silently fails). The Provides: makes any package that
# previously depended on tylervigario-website by name continue to
# resolve cleanly against this one. The < 1.5.0 boundary matches the
# next-minor bump that ships under the new name.
Obsoletes:      tylervigario-website < 1.5.0
Provides:       tylervigario-website = %{version}-%{release}

%description
Public marketing site for Vigario Technology Solutions (VTS), an
independent IT consultancy. Built on Next.js 16 (App Router) with a
custom server entrypoint, Tailwind v4, better-sqlite3 for form
submissions, nodemailer for optional notification email, and Sentry
for error + performance monitoring.

Ships:
  - Pre-built Next.js tree at /usr/share/vigario-website/
  - systemd service unit at /usr/lib/systemd/system/
  - tmpfiles.d snippet for the /var/lib + /var/cache state dirs
  - sysusers.d snippet declaring the 'website' system user
  - Canonical default env at /usr/lib/vigario-website/default.env
  - Apache reverse-proxy snippet at /usr/share/vigario-website/
    apache-snippet.conf (operator Include's it from their own vhost)

Operator-owned, NOT shipped here:
  - The Apache vhost itself (TLS, ServerName, log paths — all host-
    specific)
  - The env override file at /etc/sysconfig/vigario-website
    (optional drop-in over the canonical default)
  - The SQLite database at /var/lib/<pkg>/quotes.db (created at
    runtime by the app)


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
# /etc/sysconfig/vigario-website.
export CI=true
export HUSKY=0
export NEXT_PUBLIC_SENTRY_DSN=

npm ci --prefer-offline --no-audit --no-fund
npm run build

# Strip devDependencies after the build completes. The build pipeline
# consumes tsx / typescript / esbuild / eslint / vitest / tailwindcss /
# @tailwindcss/postcss / @types/* / prettier / husky / lint-staged /
# markdownlint-cli2 / react-email / etc.; none are needed at runtime.
# server.js is esbuild-bundled and self-contained, and `next start`
# (via server.ts -> http.createServer(handle)) resolves bare specifiers
# against the runtime dep tree only. Sheds the entire build-only
# toolchain from /usr/share/vigario-website/node_modules in the
# resulting RPM. --omit=dev is the canonical flag (npm@8+); --no-audit
# / --no-fund match the npm ci flags above.
npm prune --omit=dev --no-audit --no-fund


%install
# App tree — everything the runtime needs lives under /usr/share/<pkg>/.
# Use `cp -al` (hardlink instead of copy-content) for the big trees.
# BUILD/ and BUILDROOT/ live on the same filesystem under
# $RUNNER_TEMP/rpmbuild, so hardlinks are valid and shed the IO that
# a plain copy of node_modules + .next would incur. Safe here because
# we've disabled every BRP that mutates files in place
# (__brp_mangle_shebangs, __brp_python_bytecompile, __strip,
# debug_package) — nothing further down the build pipeline rewrites
# a file in BUILDROOT that would inadvertently mutate the BUILD-tree
# original via the shared inode.
install -d %{buildroot}%{_datadir}/%{name}
cp -al server.js .next public node_modules package.json package-lock.json \
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

# sysusers.d snippet (declarative system-user creation)
install -D -m 0644 %{SOURCE1} \
    %{buildroot}%{_sysusersdir}/%{name}.conf

# Apache reverse-proxy snippet — read-only, NOT in /etc/httpd/conf.d/.
# Operator Include's it from their own vhost (which owns TLS, domain,
# log paths). Lives in /usr/share/<pkg>/ next to other arch-indep app
# data the operator may reference.
install -D -m 0644 packaging/apache-snippet.conf \
    %{buildroot}%{_datadir}/%{name}/apache-snippet.conf

# Canonical default env — read-only, RPM-owned. The systemd unit
# loads this first, then optionally /etc/sysconfig/%%{name} for
# operator overrides (which the RPM does not ship).
install -D -m 0644 packaging/default.env \
    %{buildroot}%{_prefix}/lib/%{name}/default.env


%pre
# Declarative user creation via systemd-sysusers. The macro reads
# the sysusers.d snippet at BUILD time and inlines its content into
# this scriptlet as a heredoc fed to `systemd-sysusers --replace=...`.
# At install time, no separate file lookup is needed — the spec is
# self-contained in the RPM's %%pre.
%sysusers_create_package %{name} %{SOURCE1}


%post
# Apply tmpfiles.d immediately — don't wait for next boot.
systemd-tmpfiles --create %{_tmpfilesdir}/%{name}.conf || :

# No SELinux fcontext rules: Apache reverse-proxies to :3000 over
# TCP (governed by the httpd_can_network_connect boolean, not file
# labels), Node accesses the app tree + state in its default service
# domain, and the default labels (usr_t, var_lib_t, var_cache_t,
# etc_t) already permit those accesses. Custom httpd_sys_*_t rules
# would imply Apache reads the file tree directly — it doesn't.

%systemd_post %{name}.service


%preun
%systemd_preun %{name}.service


%postun
%systemd_postun_with_restart %{name}.service


%files
%doc README.md
%dir %{_datadir}/%{name}
%{_datadir}/%{name}/server.js
%{_datadir}/%{name}/.next
%{_datadir}/%{name}/public
%{_datadir}/%{name}/node_modules
%{_datadir}/%{name}/package.json
%{_datadir}/%{name}/package-lock.json
%{_datadir}/%{name}/apache-snippet.conf
%{_unitdir}/%{name}.service
%{_tmpfilesdir}/%{name}.conf
%{_sysusersdir}/%{name}.conf
%dir %{_prefix}/lib/%{name}
%{_prefix}/lib/%{name}/default.env


%changelog
* Mon May 11 2026 Tyler Vigario <admin@tylervigario.com> - 0.0.0-1
- Initial package. Pilot of the app-RPM-as-artifact deploy model,
  replacing the prior build-on-prod contract. Build runs on a
  self-hosted GitHub Actions runner on the prod host so the
  better-sqlite3 native binding matches the production runtime's
  glibc exactly. Deploy = `sudo dnf upgrade %{name}`.
