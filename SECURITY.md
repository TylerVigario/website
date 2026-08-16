# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** Public disclosure before a fix is available exposes any deployment that hasn't pulled the patch.

Use one of these private channels:

- **Preferred: [GitHub Security Advisory](https://github.com/TylerVigario/website/security/advisories/new)** — a private collaboration space between you and the maintainer, supporting private patch development and coordinated disclosure.
- **Fallback: email `admin@tylervigario.com`** with subject prefix `[vigario-website security]`. If you need PGP, ask in your first message and a key will be exchanged.

If you can, include:

- A description of the issue and the impact (what an attacker can do).
- Steps to reproduce — HTTP requests, sample form payloads, or screenshots.
- The version (commit SHA or release tag) and how the site is fronted (the reference deployment is Apache reverse-proxy → `127.0.0.1`).
- Your assessment of severity, if you have one.

## What counts as a security issue

This is a public marketing site with two unauthenticated form endpoints (`/api/quote`, `/api/pots-audit`) that validate input with zod, persist to SQLite via parameterized `better-sqlite3` statements, and optionally send the operator a notification email. There is no user authentication, no sessions, and no API consumers other than the site's own forms. In rough priority order, security issues are:

- **Injection** — SQL injection (the write paths use parameterized statements; novel patterns or any string-built / raw SQL helper warrant scrutiny), or HTML injection through a form field that reaches the notification email. That surface changed and is now worth more scrutiny, not less: `src/emails/templates.ts` builds the message as HTML strings rather than through a component library, so every interpolation of submitter-supplied text goes through the `esc()` helper in that file. A new interpolation that skips it is an injection into an inbox.
- **Stored or reflected XSS** — script execution via any user-entered field that is later rendered, in the browser or in the notification email an operator opens.
- **Sensitive data leakage** — SMTP credentials, the Sentry DSN, or submitted PII (names, contacts, free-text details from the `quotes` table) exposed in logs, error responses, or git history. API errors follow RFC 9457 Problem Details and must not leak internals.
- **Request-handling bypass** — a malformed request that skips zod validation, or reaches a code path that writes unvalidated data.
- **Dependency vulnerabilities** that are reachable through the running app.

The following are **not** security issues for the purposes of this policy:

- Form spam or denial of service from high-volume submissions — the endpoints are intentionally unauthenticated and unrated; abuse mitigation is an operational concern, not a vulnerability.
- UX confusion or copy/spec drift.
- Self-XSS or attacks requiring control the attacker already has.
- Findings in a deployment's reverse proxy / TLS config — those are the operator's, not this repository's.

## What to expect

This site is maintained by one person. Best-effort response:

| Severity | Acknowledgment | Fix target |
|---|---|---|
| Critical (data leakage, injection) | Within 72 hours | Within 7 days |
| High (stored XSS, secret exposure) | Within 7 days | Within 30 days |
| Medium / Low | Within 14 days | Best-effort, no commitment |

These are targets, not guarantees. Coordinated disclosure is the default — once a fix ships, a public advisory is posted to the repository's [Security tab](https://github.com/TylerVigario/website/security/advisories) with credit to the reporter unless you ask to remain anonymous.

## Supported versions

Only the latest released version on `main` is supported; older tags do not receive backported fixes. The codebase is small enough that "latest only" is the honest and sustainable policy. The AGPL gives you the right to fork and maintain your own backports.

## Scope

In scope: the `TylerVigario/website` repository at the latest commit on `main`.

Out of scope: third-party dependencies (report upstream; a coordination report here is welcome if a dependency materially affects this site), the private prod-side admin tooling, and any deployment you don't operate.

## Thanks

Good-faith reports under this policy will not result in legal action. The time researchers put into making open-source software safer is appreciated.
