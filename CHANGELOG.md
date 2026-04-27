# Changelog
## [1.1.0](https://github.com/TylerVigario/website/compare/v1.0.0...v1.1.0) (2026-04-27)

### Features

* Add deployment contract surface (sqlite-path, health endpoint)

### Bug Fixes

* Resolve lint errors in ContactForm and POTSLanding

## [1.0.0](https://github.com/TylerVigario/website/releases/tag/v1.0.0) (2026-04-03)

Marketing site as it existed before the v2 artifact deploy contract —
built and iterated under the old git-pull-and-build pipeline.

### Features

* Multi-page B2B site on Next.js 16 (App Router) and Tailwind v4: home,
  about, contact, plus dedicated pages under `/services/` for networking,
  security cameras, Windows, and Linux
* POTS-to-VoIP migration landing page with bill-audit checklist and form
* Form submission pipeline: zod-validated, persisted to SQLite, optional
  SMTP email notification when `SMTP_USER` + `SMTP_PASS` are set
* Brand identity: light-theme redesign, two-column hero with full-viewport
  + mobile scroll-snap, sticky nav with mobile hamburger, custom favicon
* SEO surface: JSON-LD (Organization, slogan, knowsAbout, address),
  sitemap, robots, canonical URLs, custom 404, web manifest, Apple icons,
  Twitter cards
* Security headers: CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Cross-Origin-Opener-Policy
* Accessibility floor: WCAG AA contrast (accent darkened to `#2970b5`),
  44px minimum touch targets, skip-to-content link with focus-visible

### Bug Fixes

* Responsive sizing all the way down to iPhone SE
* Duplicate ARIA ID conflict in the contact form (renamed to `contact-info`)
* Honest copy pass — dropped unverifiable credentials, repositioned
  around transparent pricing and anti-middleman framing
* Correct founding date (company 2021, builder experience since 2005)
* Correct business address in JSON-LD

### Refactoring

* Site converted from single-page to multi-page architecture
* Standalone Next.js output enabled for self-hosted deployment
* Dropped framer-motion in favor of CSS animations
* Plain `<img>` for nav logo to win LCP discovery
* Site copy rewrite — company voice, benefit-led headings, honest tone

