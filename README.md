# Vigario Technology Solutions

The public face of Vigario Technology Solutions — an independent IT
consultancy. It exists to do two things: establish that the business is
real and competent, and turn the people who believe that into
conversations. Brand presence and lead generation. Everything on it
serves one of those two.

The case studies are the credibility half. The forms are the other
half, which is why they get disproportionate attention: a form that
loses what someone typed is a lead thrown away, and no amount of good
copy upstream recovers it. `/pots-migration` is one campaign landing
page among that surface, not the reason the site exists.

Stack: Astro 7 (hybrid — pages prerender, only `/api/*` renders on
demand), Tailwind v4, better-sqlite3 for quote/audit submissions,
nodemailer for the optional "someone filled out a form" notification,
zod for validation shared between the endpoints and the browser.

No UI framework. Most pages ship no JavaScript at all; the forms carry
~2 KB and the case-study viewer ~3 KB, inline. `npm run check:bundles`
asserts that, so it is a fact about the build rather than a claim in a
readme. Errors go to stdout, for whatever supervises the process to collect.

## Local dev

```bash
cp .env.example .env.local   # SQLITE_PATH at minimum (absolute path)
mkdir -p data                # The data dir is gitignored
npm ci
npm run dev
```

`SQLITE_PATH` must be an absolute path — relative paths are rejected at
the first database open by [getDbPath()](src/lib/db.ts) (they
resolve against the process working directory, which the app does not
control, and the dev/prod fail-fast surface should match).

`npm run preview` serves the built output, and `npm start` runs the
compiled server directly (`node ./dist/server/entry.mjs`) — the same
entrypoint production runs. Both need a prior `npm run build`.

Pre-commit runs lint-staged then `astro check` and the tests. Commitlint enforces the Angular type set on the message
— `feat`, `fix`, `refactor`, `perf`, `revert`, `ci`, `build`, `docs`,
`test`, `chore`, lowercase subject. Only `feat`/`fix`/`revert` cut a
release; the rest ship no version bump. Don't try to be clever.

## Where stuff lives

```text
src/pages/                     # ROUTES — one file, one URL. No router config.
  index about contact services services/* work/* pots-migration
  404 500                      # prerendered like any other page
  robots.txt.ts                # generated from `site`, so the domain lives in one place
  manifest.webmanifest.ts      # generated, so icon paths cannot drift from reality
  api/quote                    # POST: zod-validated, writes to sqlite, optionally emails me
  api/pots-audit               # POST: same flow, scoped to the POTS landing page
  api/health                   # GET: opens db, SELECT 1 FROM sqlite_schema
src/lib/
  db.ts                        # better-sqlite3 singleton on globalThis
  api/                         # zod: QuoteRequest, PotsAuditRequest, ProblemDetails (RFC 9457)
  forms/enhance.ts             # progressive enhancement. Never erases what you typed.
  forms/rules.ts               # client-side rules, proven equivalent to the schemas by a test
  services.ts work.ts          # content catalogs
  email/mailer.ts              # nodemailer; best-effort form notification, logged on failure
src/emails/templates.ts        # notification bodies as HTML strings, escaped at every interpolation
src/components/                # .astro — Nav, Hero, the forms, Lightbox, icons/
src/layouts/Base.astro         # <head>, canonical URL, nav, footer
src/scripts/                   # the only browser JS: lightbox, scroll reveal
src/styles/global.css          # @theme tokens and the reveal rules
```

## Build & gate

There is no release pipeline yet. One is being built against the static
shape the site is moving to; until it exists, this repository builds and
gates and does not ship anything.

`npm run ci` is the gate, and it is the same gate CI runs:

```text
lint → typecheck → format → test → build → check:bundles
```

Run it before pushing and CI should hold no surprises. The `pre-push`
hook runs the build and bundle assertion for you; `pre-commit` keeps to
the fast checks (lint-staged, typecheck, test) so committing stays
quick.

`.github/workflows/ci.yml` is one job, `Gate`, on every PR and every
push to main. It runs the same steps, plus a Node-major pin check and
actionlint — actionlint is the one check with no local equivalent,
since it is a Go binary with no usable npx wrapper.

CHANGELOG is regenerated from commit messages by git-cliff — don't
hand-edit it. `cliff.toml` and the conventional-commit convention are
independent of whatever ships the site; whatever comes next reads the
same commits.

## Things that have bitten me / will bite me again

- **Node major drift**. Bump `.nvmrc` and `engines.node` together — CI
  reads `.nvmrc` directly, so there is no third pin to forget.
- **better-sqlite3 native binding**. Since v13 it is N-API-based, so
  the prebuilt binary ships with the package and survives a Node major
  bump — that stopped being a rebuild trigger. It still compiles from
  source where no prebuilt matches the platform, which needs a
  toolchain wherever `npm ci` runs.
- **SQLITE_PATH must be absolute**. App throws at startup via
  getDbPath() if unset or relative. No cwd fallback — that bit me
  when an old deploy wrote `data/quotes.db` inside a release dir that
  got nuked on the next swap.
- **Health check is `/api/health`**, not `/`. The homepage rendering
  200 only means the static tree is being served — those are files and
  would keep serving with the process dead. Health runs four checks
  (open, read, schema, write-probe) and returns 503 with which one
  failed. The write probe is the point: a full disk, a read-only
  remount or a permissions change leaves SELECT working while every
  submission fails.
- **Type-aware ESLint** (`recommendedTypeChecked`) is on. `req.json()`
  is `any`. Parse through a zod schema in `src/lib/api/`.
- **Tests run via vitest** — `npm test` (one-shot) or `npm run test:watch`.
  `form-rules.test.ts` proves the
  hand-written client validation agrees with the zod schemas the server
  enforces — same verdict and same wording, checked both ways. The
  pre-commit hook and the CI gate both run them.
- **`npm run typecheck` is `astro check`, not `tsc`.** tsc only sees
  script blocks; astro check validates templates and component props.
  Running tsc alone once reported zero while 89 template errors stood,
  including a missing form component and a missing FAQ accordion.

## Domain

`vigario.tech` once DNS/SSL is sorted. For now it answers on
tylervigario.com.

## License

The software is **AGPL-3.0-or-later** — see [LICENSE](LICENSE) for the
verbatim text. Fork it, change it, run it; if you modify it and serve it
over a network, §13 obliges you to offer your users your modified source
in turn. That obligation runs to forkers, never to the author.

**Two things are reserved and not granted under it:** the brand and
imagery in `src/assets/images/` (logo, hero, every client screenshot),
and the written content — the case studies, service descriptions and
landing copy. Those are © Vigario Technology Solutions, All Rights
Reserved.

The line is drawn precisely in [LICENSE-NOTICE.md](LICENSE-NOTICE.md),
path by path, so nobody has to infer it. The short version: the
machinery is yours to take, the account of real client work is not.
