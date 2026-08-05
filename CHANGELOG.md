# Changelog
## [1.10.0](https://github.com/TylerVigario/website/compare/v1.9.0...v1.10.0) (2026-08-05)

### Features

* **work:** Add the iTaleSoWell case study 

## [1.9.0](https://github.com/TylerVigario/website/compare/v1.8.1...v1.9.0) (2026-07-23)

### Features

* **work:** Add product visuals to the /work case-study pages 

## [1.8.1](https://github.com/TylerVigario/website/compare/v1.8.0...v1.8.1) (2026-07-23)

### Bug Fixes

* **build:** Regenerate lockfile under npm 11.17.0 to restore libc guards 

## [1.8.0](https://github.com/TylerVigario/website/compare/v1.7.0...v1.8.0) (2026-07-22)

### Features

* **work:** Open pipetree screenshots full-size in a lightbox 

## [1.7.0](https://github.com/TylerVigario/website/compare/v1.6.0...v1.7.0) (2026-07-22)

### Features

* Add /work case-study index and VoIP case study 

## [1.6.0](https://github.com/TylerVigario/website/compare/v1.5.4...v1.6.0) (2026-07-22)

### Features

* Add pipetree case-study page under /work 

### Bug Fixes

* **packaging:** Harden the service sandbox (PrivateUsers, owner-only state) 

## [1.5.4](https://github.com/TylerVigario/website/compare/v1.5.3...v1.5.4) (2026-05-14)

### Bug Fixes

* **packaging:** Remove backticks from sysusers comment to unblock %pre
* **workflow:** Tag-after-artifact ordering in release job

## [1.5.3](https://github.com/TylerVigario/website/compare/v1.5.2...v1.5.3) (2026-05-13)

### Bug Fixes

* **packaging:** Escape %%global in spec comment to unblock rpmbuild

## [1.5.2](https://github.com/TylerVigario/website/compare/v1.5.1...v1.5.2) (2026-05-13)

### Bug Fixes

* **packaging:** Parameterize backend port in apache snippet

## [1.5.1](https://github.com/TylerVigario/website/compare/v1.5.0...v1.5.1) (2026-05-12)

### Bug Fixes

* **workflow:** Short-circuit version step on skip + honor bump input for chore-only windows

## [1.5.0](https://github.com/TylerVigario/website/compare/v1.4.6...v1.5.0) (2026-05-12)

### Features

* Relicense as AGPL-3.0-or-later for public open-source release

### Bug Fixes

* **packaging:** Obsolete tylervigario-website + document the cutover

## [1.4.6](https://github.com/TylerVigario/website/compare/v1.4.5...v1.4.6) (2026-05-12)

### Bug Fixes

* **packaging:** Move rpmbuild topdir to RUNNER_TEMP 
* **build:** Externalize instrumentation chain to dodge turbopack hash-require bug 

## [1.4.4](https://github.com/TylerVigario/website/compare/v1.4.3...v1.4.4) (2026-05-12)

### Bug Fixes

* **packaging:** Scope rpmbuild to $GITHUB_WORKSPACE, drop the find scan 

## [1.4.3](https://github.com/TylerVigario/website/compare/v1.4.2...v1.4.3) (2026-05-11)

### Bug Fixes

* **packaging:** Own env file root:root to avoid group(website) dep 

## [1.4.1](https://github.com/TylerVigario/website/compare/v1.4.0...v1.4.1) (2026-05-11)

### Bug Fixes

* **packaging:** Drop rpm --import on self-hosted runner 

## [1.4.0](https://github.com/TylerVigario/website/compare/v1.3.6...v1.4.0) (2026-05-11)

### Features

* **packaging:** Move release job to self-hosted runner on repo host 

## [1.3.6](https://github.com/TylerVigario/website/compare/v1.3.5...v1.3.6) (2026-05-11)

### Bug Fixes

* **packaging:** Import pubkey into rpm's keyring for sign verification 

## [1.3.5](https://github.com/TylerVigario/website/compare/v1.3.4...v1.3.5) (2026-05-11)

### Bug Fixes

* **packaging:** Drop bogus %__gpg_sign_cmd override, use extra_args macro 

## [1.3.4](https://github.com/TylerVigario/website/compare/v1.3.3...v1.3.4) (2026-05-11)

### Bug Fixes

* **packaging:** Disable debug_package — no debuginfo for vendored prebuilds 

## [1.3.3](https://github.com/TylerVigario/website/compare/v1.3.2...v1.3.3) (2026-05-11)

### Bug Fixes

* **packaging:** Declare arch as x86_64 — better-sqlite3 ships native binding 

## [1.3.2](https://github.com/TylerVigario/website/compare/v1.3.1...v1.3.2) (2026-05-11)

### Bug Fixes

* **packaging:** Don't preset NODE_ENV=production before npm ci 

## [1.3.1](https://github.com/TylerVigario/website/compare/v1.3.0...v1.3.1) (2026-05-11)

### Bug Fixes

* **packaging:** Systemd-rpm-macros BuildRequires + annotated release tag 

## [1.3.0](https://github.com/TylerVigario/website/compare/v1.2.1...v1.3.0) (2026-05-11)

### Features

* **forms:** Adopt rfc 9457 problem details + react-hook-form
* **packaging:** Introduce tylervigario-website RPM, retire build-on-prod 

### Bug Fixes

* **packaging:** Use --passphrase-file in rpmsign macros 
* **packaging:** Use versioned Node binary throughout 
* **packaging:** Install nodejs24-npm alongside nodejs24 

## [1.2.1](https://github.com/TylerVigario/website/compare/v1.2.0...v1.2.1) (2026-05-09)

### Bug Fixes

* **build:** Bundle server.ts via esbuild + nft for full standalone trace

## [1.2.0](https://github.com/TylerVigario/website/compare/v1.1.0...v1.2.0) (2026-05-09)

### Features

* Align with vis-daily-tracker v2 deploy contract and wire Sentry
* **deps:** Add commander v8.3.0 to package-lock.json

## [1.1.0](https://github.com/TylerVigario/website/compare/v1.0.0...v1.1.0) (2026-04-27)

### Features

* Add deployment contract surface (sqlite-path, health endpoint)

### Bug Fixes

* Resolve lint errors in ContactForm and POTSLanding

## [1.0.0](https://github.com/TylerVigario/website/releases/tag/v1.0.0) (2026-04-03)

### Features

* Scaffold VTS landing page
* Add hero constellation and retro-tech background to about section
* Visual polish — section surfaces, card hovers, gradient text, counter, CTA texture
* Custom favicon, Google Business link, GitHub icon in footer
* Complete site redesign — light theme, new branding, updated services
* Quote form, merged services, About rewrite, Hero CTA rework
* Hero image, two-column hero layout, color nav logo
* Full-viewport hero with scroll snap on mobile
* SEO overhaul — JSON-LD, meta, sitemap, robots, domain update
* SEO round 2 — canonical, JSON-LD expansion, manifest, apple icon, accessibility
* JSON-LD — add slogan and knowsAbout for richer search signals
* Add CSP and security headers
* Add COOP header for origin isolation
* Add POTS-to-VoIP migration landing page
* Add dedicated service pages for networking, cameras, Windows, and Linux

### Bug Fixes

* Responsive spacing and overflow fixes
* SEO meta, accessibility, contact nav target, image optimization
* Mobile responsive sizing for small screens (iPhone SE)
* Hero polish — line break, watermark, CTA icon, spacing
* Layout balance — service cards, About sidebar, CTA trust signals
* UX improvements — nav highlighting, scroll offsets, form polish, clickable services
* Remove double focus outline on form inputs
* Add brand colors to GitHub and Google Business footer icons
* Replace unverifiable credentials with honest differentiators in About
* Enforce 44px minimum touch targets across all interactive elements
* Hide hero image on mobile, increase nav clearance
* Correct VTS founding date — company 2021, founder experience since 2005
* Sharpen copy — builder identity, anti-middleman positioning
* Pricing language — transparent rate, approachable for all clients
* Favicon — bold V on navy, readable at any size
* Darken accent to #2970b5 for WCAG AA contrast ratio
* Duplicate ARIA ID — rename contact input to contact-info
* Correct business address in JSON-LD
* Skip-to-content link — use focus-visible to prevent resize flash
* SEO quick wins — custom 404, Twitter cards, trailing slash config

