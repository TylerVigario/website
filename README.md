# Vigario Technology Solutions

**Jesus is Lord.**

The website of Vigario Technology Solutions, an IT consultancy in
California's Central Valley. Its code is given freely under the AGPL:
take it, change it, run it. The written content and the brand are the
business's own, and [LICENSE-NOTICE.md](LICENSE-NOTICE.md) draws that
line path by path.

The site does two things: it establishes that the business is real and
competent, and it turns the people who believe that into conversations.
Everything on it serves one of those two.

The case studies are the credibility half. The forms are the other
half, which is why they get disproportionate attention: a form that
loses what someone typed is a lead thrown away, and no amount of good
copy upstream recovers it. `/pots-migration` is one campaign landing
page among that surface, not the reason the site exists.

Stack: Astro 7 (hybrid — pages prerender; `/api/*` and the two pages
that take input, `/contact` and `/pots-migration`, render on demand),
Tailwind v4, better-sqlite3 for quote/audit submissions, nodemailer for
the optional "someone filled out a form" notification, and zod for
validation on the server. The browser runs hand-written rules instead,
which a test holds to the same verdicts and messages as the schemas.

No UI framework. A plain page ships about 500 B of JavaScript (the
scroll reveal), a case study with screenshots about 5.2 KB, image viewer
included, and the two input pages about 5.6 KB, form script included,
all as files rather than inline. `npm run check:bundles` budgets every
prerendered page, following imports, so a page that outgrows its budget
fails the build. Logs go to stdout and errors to stderr, for whatever
supervises the process to collect.

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

Pre-commit runs lint-staged, then `astro check` and the tests.
Commitlint holds each message to Conventional Commits, and the type is
the release decision: CLAUDE.md's "Git + PR workflow" says which types
bump and why.

## Where stuff lives

One file per URL under `src/pages/`, with no router config. The rest of
the tree is mapped in CLAUDE.md's "Key paths", so there is one map to
keep true.

## Build & gate

`Release` is a `workflow_dispatch`: it derives the version from the
commits, runs the pull-request gate against that commit, builds one
self-contained tarball, attests it through Sigstore, writes the bump and
changelog as a forge-signed commit on a release branch, publishes the
artifact and its attestation bundle there, which creates the tag, and
only then moves `main` to that
commit. Nothing is written anywhere until the artifact exists and is
attested, and `main` does not move until the release exists. A failure
after publishing leaves `main` one commit behind the release, and
dispatching again finishes that version before any other. Merging waits
while a release runs: `main` has to be where the release branch was cut
when `main` moves. The dispatch asks how far to move (auto, patch, minor
or major), never for a number, so no version can be skipped or reused. A
dry run does everything short of publishing and writes nothing.

Merging and releasing are separate decisions, so nothing ships on merge.
Installing a release is the host's business — the repo carries no tool
that runs on a server.

`npm run ci` runs the gate's checks in one go; `package.json` lists
them. Run it before pushing and CI should hold no surprises. The `pre-push`
hook runs all of it for you; `pre-commit` keeps to the fast checks
(lint-staged, typecheck, test) so committing stays quick.

`.github/workflows/ci.yml` runs each of those checks as its own job, on
every PR and every push to main, and as the gate of every release, plus
a Node pin check, a run of the release artifact itself, a
dev-server boot, and a check that `.github/workflows/actions.lock` records
every workflow. Each job is a required check of its own, so a red one
names what failed. actionlint, which `npm run lint` runs over the
workflows, is a devDependency, so every clone has it. The shellcheck it
uses on `run:` blocks is found on your PATH: locally that pass is skipped
where you do not have it, and in CI it always runs.

CHANGELOG is regenerated from commit messages by git-cliff — don't
hand-edit it. `cliff.toml` and the conventional-commit convention are
independent of whatever ships the site; whatever comes next reads the
same commits.

## Things that have bitten me / will bite me again

- **Node version drift**. Bump `.nvmrc` and `engines.node` together:
  CI installs the exact version `.nvmrc` names, and
  `npm run check:pins` fails until the two agree.
- **better-sqlite3 native binding**. Since v13 it is N-API-based, so
  the prebuilt binary ships with the package and survives a Node major
  bump — that stopped being a rebuild trigger. It still compiles from
  source where no prebuilt matches the platform, which needs a
  toolchain wherever `npm ci` runs.
- **SQLITE_PATH must be absolute**. The app throws via getDbPath() if it
  is unset or relative, when the database is first opened (the first
  page with a form, submission or health check; static pages keep serving). No cwd fallback — that bit me
  when an old deploy wrote `data/quotes.db` inside a release dir that
  got nuked on the next swap.
- **Health check is `/api/health`**, not `/`. The homepage rendering
  200 only means the static tree is being served — those are files and
  would keep serving with the process dead. Health runs the checks that
  answer whether a submission would be stored, which
  `src/pages/api/health.ts` names, and returns 503 naming the one that
  failed. The write probe is the point: a full disk, a
  read-only remount or a permissions change leaves SELECT working while
  every submission fails. Three more are advisory — whether mail is on,
  whether every lead was announced, and whether the spam lists are fresh
  — and report "degraded" with a 200, since rolling back a release
  fixes none of them.
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

## License

Copyright © 2026 Vigario Technology Solutions.

The software is **AGPL-3.0-or-later**: the GNU Affero General Public
License, version 3 or, at your option, any later version. See
[LICENSE](LICENSE) for the verbatim text. Fork it, change it, run it; if
you modify it and serve it over a network, §13 obliges you to offer your
users your modified source in turn. That obligation runs to forkers,
never to the author.

**Two things are reserved and not granted under it:** the brand — the
name and the logo — with the imagery in `src/assets/images/` (our own
photographs, every client screenshot), and the written content — the
case studies, service descriptions and landing copy. Those are
Vigario Technology Solutions' own, All Rights Reserved.

The line is drawn precisely in [LICENSE-NOTICE.md](LICENSE-NOTICE.md),
path by path, so nobody has to infer it. The short version: the
machinery is yours to take, the account of real client work is not.
