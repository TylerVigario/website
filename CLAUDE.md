# CLAUDE.md

Context Claude Code needs at the start of every conversation to work
effectively on this codebase. Vocabulary + guardrails + canonical
paths. Everything else is discoverable via grep/glob — don't duplicate
here.

See `README.md` for the feature showcase and design rationale.

## What this is

Public marketing site for Vigario Technology Solutions (VTS), an
independent IT consultancy. It has two jobs: **brand presence** and
**lead generation**. The case studies and service pages do the first;
the forms do the second.

That ordering explains where the care goes. A form that loses what
someone typed is a lead thrown away, and nothing upstream recovers it —
which is why the never-erase invariant below is treated as a hard
property of the code rather than a nicety. `/pots-migration` is one
campaign landing page on that surface, not the reason the site exists.

Stack: Astro 7 hybrid, Tailwind v4, better-sqlite3, nodemailer with
plain-HTML templates in `src/emails/templates.ts`, zod for validation.
No auth, no API consumers other than the site's own forms.

**No UI framework, and that is load-bearing.** Nothing here needs one:
the menu is `<details>`, the reveal is one CSS rule armed by a 500-byte
script, the lightbox is `<dialog>` plus scroll-snap, and the forms post
HTML. Most pages ship zero JavaScript, and `npm run check:bundles`
asserts it locally and in CI. If
something ever genuinely needs a framework, argue for it then — do not
reintroduce one to solve a problem the platform already solves.

License: **AGPL-3.0-or-later** for the software, with two categories
reserved and not granted — brand imagery in `src/assets/images/`, and
the written content (case studies, service descriptions, landing copy).
`LICENSE-NOTICE.md` draws that line path by path and is the file to
update if anything moves.

The boundary is load-bearing rather than decorative. The reservation
previously named `public/images/`, which the Astro rebuild emptied when
images moved to `src/assets/` for build-time processing — so it reserved
nothing while appearing to reserve everything. And the README described
the marketing copy as covered by AGPL and then asked readers not to take
it, which granted the thing it was asking people to leave alone. A
request is not a licence term.

## Deploy contract — the repo releases, the host installs

This repository builds, gates and **releases**. It does not install
anything anywhere, and it holds no tool that runs on a server.

`Release` (`workflow_dispatch`) computes the version from the commits,
builds one self-contained tarball, attests it through Sigstore, writes
the version and changelog to `main` as a forge-signed commit, and
publishes the tag and the artifact in a single call. Everything that can
fail runs before anything is written, so a failed release leaves no
commit, no tag and no release behind.

The artifact is `dist/`, `node_modules/` (better-sqlite3 only, for the
native addon that cannot be bundled), a generated `package.json`,
`CHANGELOG.md`, `RELEASE` (version + the commit the source came from),
and `MANIFEST.sha256` — a sha256 of every other file in the tree. It runs
on `node dist/server/entry.mjs` with `SQLITE_PATH` set, needs no
toolchain and no network, and is ~9.4 MB.

**Installing it is the host's job, and the tools for that live on the
host.** Fetching, verifying and swapping a release are operations on a
machine, not on this codebase — and a verifier shipped from the
repository it verifies proves nothing about the artifact it checks. What
this repo owes an installer is the contract above plus the attestation:
`gh attestation verify` establishes the tarball came from this workflow,
and `MANIFEST.sha256` inside it answers "is the installed tree still what
was built" at any time afterwards, which a whole-archive checksum cannot.

What is true about the app regardless of what ships it: `astro build`
emits `dist/client/` (the static tree, which a web server serves
directly) and `dist/server/entry.mjs` (the Node process, which exists
only to answer `/api/*` and render the two pages that accept input).
`npm start` runs that entrypoint.

`cliff.toml` and `CHANGELOG.md` are independent of the release
mechanism — the conventional-commit convention outlives whatever
consumes it.

## Serving contract

What the server in front of this must do. The repo is entitled to assert
it because the repo decides what gets emitted — but only to assert the
*contract*. Apache, nginx, Caddy, a CDN in front of any of them: how it
is expressed is the deployment's business, and nothing here should read
as though one of them is the way.

| Path | Handling |
| --- | --- |
| `/_astro/*` | Static file. `Cache-Control: public, max-age=31536000, immutable` — every filename is content-hashed (verified: 0 unhashed of 177), so a stale cache is impossible and revalidation is wasted. |
| `/api/*` | Reaches the Node process. |
| `/contact`, `/pots-migration` | Reaches the Node process — the only two pages with `prerender = false`, because they accept input. |
| everything else | Static file from `dist/client/`. Unmatched paths should fall through to the Node process, so adding a dynamic route does not 404 until the server config catches up. |

Two properties are worth stating, because both are easy to lose by
accident and neither is visible from the config alone:

**The immutable rule has to match the prefix Astro actually emits.**
That is `/_astro/`. A rule matching some other prefix is not a no-op —
it silently drops caching on all 177 hashed assets, fonts and every
image variant included, on a site whose weight is almost entirely
images. This is precisely how it was wrong before: the rule still named
`/_next/static/`, inherited from the framework this site no longer uses.

**Routing everything to the Node process is the failure mode to avoid.**
It is what a single-process framework needs and what this one does not.
It costs the two properties the hybrid split exists to buy: static pages
that never touch Node, and a Node crash that takes down form submission
rather than the whole site.

The Node process needs `SQLITE_PATH` (absolute) and reads `HOST`/`PORT`;
it is `node dist/server/entry.mjs`. Nothing else about the machine —
process supervision, TLS, DNS, where the files live — belongs in this
repository.

## Core vocabulary

- **Quote** — a "request a quote" submission from the main contact form. Schema in [`src/lib/api/quote.ts`](src/lib/api/quote.ts). Route handler at [`src/pages/api/quote.ts`](src/pages/api/quote.ts).
- **POTS audit** — a "free phone-bill audit" submission from the `/pots-migration` landing page. Different schema ([`src/lib/api/pots-audit.ts`](src/lib/api/pots-audit.ts)), same destination row.
- **`quotes` table** — single SQLite table that holds both kinds of submission. The `services` column distinguishes: a real services array for quote submissions, the literal string `"POTS Migration Audit"` for audit submissions. Schema is `CREATE TABLE IF NOT EXISTS` inside `getDb()` — no migrations.
- **Problem Details** — every API error response shape, per RFC 9457. Server emits `{type, title, status, detail?, errors?}` via [`src/lib/api/error.ts`](src/lib/api/error.ts)'s `zodError()`, whose response body is annotated with the `ProblemDetails` type so a change to the shape fails the build. The client does **not** import that schema: [`enhance.ts`](src/lib/forms/enhance.ts) reads the shape by hand, because validating it in the browser would pull zod into a bundle that is otherwise ~2 KB in order to re-check a response this server just produced. See "Form patterns" below.

## Key paths

Pages are files. There is no router config, and no `(main)` group —
the URL is the path under `src/pages/`.

```text
src/
├── pages/                            # ROUTES. One file, one URL.
│   ├── index.astro  about.astro  contact.astro  services.astro
│   ├── services/                     # linux, networking, security-cameras, windows
│   ├── work/                         # case studies: italesowell, pipetree, voip
│   ├── pots-migration.astro          # the campaign landing page
│   ├── 404.astro  500.astro          # error pages, prerendered to static HTML
│   ├── robots.txt.ts                 # generated from `site` in astro.config.mjs
│   ├── manifest.webmanifest.ts       # generated, so icon paths cannot drift
│   └── api/                          # prerender = false, like contact + pots-migration
│       ├── quote.ts                  # POST: zod-validated, writes sqlite, optionally emails
│       ├── pots-audit.ts             # POST: same destination row, different schema
│       └── health.ts                 # GET: open/read/schema/write-probe → 200 or 503
├── components/                       # .astro, render to HTML at build time
│   ├── QuoteForm.astro  PotsAuditForm.astro
│   ├── Lightbox.astro                # <dialog> + scroll-snap viewer
│   ├── POTSLanding.astro             # hero, case study, FAQ, form
│   └── icons/                        # inline SVG, incl. icons/services/*
├── layouts/Base.astro                # <head>, canonical, nav, footer
├── lib/
│   ├── db.ts                         # better-sqlite3 singleton
│   ├── services.ts  work.ts          # content catalogs
│   ├── forms/
│   │   ├── enhance.ts                # progressive enhancement; never erases input
│   │   └── rules.ts                  # client rules mirroring the schemas
│   ├── api/                          # error.ts (RFC 9457), quote.ts, pots-audit.ts
│   └── email/mailer.ts               # nodemailer; best-effort, logged on failure
├── emails/templates.ts               # HTML strings, escaped at every interpolation
├── scripts/                          # browser-side: reveal.ts, lightbox.ts
├── styles/global.css                 # @theme tokens + the reveal rules
└── assets/                           # images processed by astro:assets

tests/
└── form-rules.test.ts                # proves rules.ts and the zod schemas agree

(no docs/, packaging/, instrumentation.ts or sentry.*.config.ts — if a
sibling repo or an old memory says otherwise, the tree above is right)
```

## Form patterns (progressive enhancement + zod + Problem Details)

Both forms ([`QuoteForm.astro`](src/components/QuoteForm.astro) and
[`PotsAuditForm.astro`](src/components/PotsAuditForm.astro)) are plain
HTML `<form method="post">` that work with JavaScript disabled, then
get enhanced by [`enhance.ts`](src/lib/forms/enhance.ts).

**The rule that outranks the others: nothing ever erases what someone
typed.** Not on a validation failure, not on a server error, not on a
reload. There is exactly one assignment to `input.value` in the entire
codebase — restoring a saved draft, guarded to fields that are empty.
That is not a convention to uphold; it is the absence of a code path.

Two suites hold it, from opposite ends.
[`never-erase.test.ts`](tests/never-erase.test.ts) is structural and
proves no destructive path exists: exactly one `.value =` in the tree,
in the restore, guarded on an empty field; no `form.reset()`;
`innerHTML` only on elements just created.
[`draft-persistence.test.ts`](tests/draft-persistence.test.ts) is
behavioural and proves the constructive half actually works — a draft
saves, comes back into a form built from scratch, restores checkbox
groups, refuses to overwrite live input, and shrugs off corrupt JSON.

That split matters: losing input by erasing it and losing it by never
saving it cost the same, but only the first is loud. Every guard in
both was verified by breaking the behaviour and watching the right test
fail.

- Fields validate on blur, then continuously once touched. Validating from the first keystroke tells someone their email is invalid while they are still typing the `@`.
- Drafts persist to `localStorage` on input and survive a reload, a crash, or a closed tab. The data is the user's, kept on the user's machine, cleared only on a successful submit.
- Errors render as sibling nodes next to the field. The form is never re-rendered, so the DOM the user is typing into is never replaced underneath them.
- On `!res.ok` the response is parsed as Problem Details and each `errors[]` entry is matched to its field by name. Unmatched or top-level failures render in a form-level `role="alert"`.
- Client rules live in [`rules.ts`](src/lib/forms/rules.ts), hand-written and deliberately more permissive than the schema, so the browser never rejects something the server would have accepted. [`tests/form-rules.test.ts`](tests/form-rules.test.ts) proves the two agree in both directions, including field-set equality — it already caught two fields missing from the POTS rules.
- Validation is structural, not stylistic: a phone field rejects letters because a phone number has no letters, and an `extension` field exists so nobody has to smuggle one into a field that is not for it.
- a11y baseline: `aria-required`, `aria-invalid` toggled dynamically, `aria-describedby` linking input → error node. Chip groups are `<fieldset><legend>` around native checkboxes sharing one `name`, so the browser aggregates them into an array with no script involved.

## Route handler pattern

```ts
export const prerender = false; // one of five: the 3 api routes + the 2 input pages

export const POST: APIRoute = async ({ request }) => {
  // Accepts BOTH application/json (enhanced path) and form-urlencoded
  // (the no-JS path). The second is why the endpoint exists: a form
  // that only works with JavaScript silently swallows the one thing
  // this site is for.
  const body = await readBody(request);        // malformed → null → 400
  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) return zodError(parsed); // RFC 9457

  // Do the work. Genuine errors propagate — no top-level try/catch.

  // The email send keeps its own try/catch: the row is already saved,
  // so SMTP being down must not turn a captured lead into a 500.
  // A form-urlencoded submit redirects; a JSON submit gets JSON.
};
```

## Commands

```bash
npm run dev                       # astro dev
npm run preview                   # serve the built output
npm run build                     # astro build → dist/client (static) + dist/server (the /api process)
npm start                         # node dist/server/entry.mjs (after build)
npm run typecheck                 # astro check — sees .astro templates; tsc alone does not
npm test                          # vitest run
npm run lint                      # eslint (js) + markdownlint (md)
npm run format                    # prettier --check
npm run format:fix                # prettier --write
npm run ci                        # lint + typecheck + format + test (gate umbrella)
npm run lint:actions              # actionlint over .github/workflows
npm run clean                     # rm .next, server.js, .eslintcache, node_modules/.cache
```

## Code style & conventions

- Prettier: 100 col, double quotes, trailing commas, semicolons.
- ESLint flat config with type-aware rules (`recommendedTypeChecked`). `req.json()` returns `any` — always parse through a zod schema.
- Path alias: `@/*` → `src/*`.
- **Conventional Commits** — Angular type set, inherited from `@commitlint/config-conventional` rather than declared. The line the types draw is **did the artifact change**, because the version names a tarball: `feat` (minor bump), `fix` / `revert` / `perf` / `refactor` / `build` (patch bump), all six in the changelog; `ci` / `docs` / `test` / `chore` / `style` reach no artifact, so no bump and no changelog entry. **Type = release impact, not change-nature** — a bug fix inside CI infra is `ci:` (no release), not `fix(ci):`. Matches pipetree's set (the canonical sibling). `.commitlintrc.js` carries only genuine overrides — the type set, type-case and subject rules come from the extended config, so there is no second copy to drift. The bump matrix lives in `cliff.toml`'s `commit_parsers`. `footer-leading-blank` is deliberately off (the conventional-changelog parser greedy-detected mid-body `Word:` line starts as the footer boundary and false-fired on natural prose like "What landed:" / "Why:"; the comment in `.commitlintrc.js` records why).
- Husky hooks: `pre-commit` runs `lint-staged` (with Windows defensive re-stage) → `typecheck` → `test`; `commit-msg` runs `commitlint`; `pre-push` enforces the `<type>/<slug>` branch-name convention.
- `CHANGELOG.md` is regenerated from commits by git-cliff at release time — never hand-edit. Fix the commit message, not the changelog. (Because `ci`/`docs`/`test`/`chore`/`style` are skipped, a regeneration drops those entries — the changelog reflects what changed in the artifact, not every commit. One parser list drives the changelog **and** `--bumped-version`, so a type cannot be recorded without also bumping; that coupling is why "every commit in the changelog" is not on the table. It ships inside the release tarball, so it is read on the host, not only on GitHub.)

## Git + PR workflow

Hard rules. These mirror pipetree's; they exist because violating them produced concrete, hard-to-undo damage in the sibling repos.

- **No direct commits to `main`.** Always branch first — `git branch --show-current` before any commit; if it says `main`, `git checkout -b <type>/<slug>` first. The release workflow's `chore(release)` push is the only thing that lands directly on `main`.
- **Linear-only `main`, no force-push.** Rebase is the workflow. If a pull created a merge commit, fix it (reset + rebase + re-apply) rather than merging.
- **Type = release impact, not change-nature.** The commit/PR *type* carries "does this ship to users" (only `feat`/`fix`/`revert` bump); the *scope* carries "where in the codebase." A bug fix inside CI infrastructure is `ci:` (no release), not `fix(ci):` (would bump patch).
- **PR titles MUST be conventional.** Squash-merge uses the PR title as `main`'s commit message, so a non-conventional title pollutes `main` and breaks the release pipeline that walks commits to drive bumps. Enforced by [`.github/workflows/pr-title.yml`](.github/workflows/pr-title.yml), which reuses `.commitlintrc.js` as the single source of truth.
- **Branch names match `<type>/<slug>`** — same type vocabulary as commitlint, plus `integration` for multi-PR series. Enforced by `.husky/pre-push`. Bypass once with `git push --no-verify`; don't make a habit of it.
- **Never force-push a closed PR's branch.** GitHub permanently locks reopen with "branch was force-pushed or recreated." If a force-push is needed, confirm the PR is currently OPEN first (`gh pr view <n> --json state`).
- **PR numbers are permanent.** When `gh pr reopen` / `gh pr edit` fails on the right PR, STOP and ask — never fall back to `gh pr create` for the same body of work, which burns a PR number on a duplicate.
- **Empty commits drop on rebase-update.** `git commit --allow-empty` + GitHub's rebase-update silently drops the commit and auto-closes the PR. Make the commit non-empty, or use merge-update.

### Multi-PR series

A change spanning 2+ PRs needs the series-as-shipped to be what you tested, not the per-PR view (per-PR green ≠ series-as-shipped green).

- **Predictable upfront**: branch `integration/<slug>` off `main`; sub-PRs target the integration branch (each still gets full CI via `pull_request`). The closing `integration/<slug>` → `main` PR is the release unit.
- **Not predictable upfront**: control the release boundary with commit type. Intermediate PRs merge as `refactor:` / `chore:` (no bump); the closing PR that makes the series cohere gets `fix:` / `feat:` and ships.

Don't introduce a permanent `develop` branch — the ceremony outweighs the benefit for a single-prod app. Integration branches are short-lived and per-series; `main` stays trunk.

## Environment

- **Dev**: Windows 11 + git-bash. Node via `fnm` — Bash sessions need `eval "$(fnm env --use-on-cd --shell bash)"` once before `npm`/`node` resolve. PowerShell tool also available.
- **Prod**: runs a published release, which is not necessarily the tip of `main` — check the deployed `RELEASE` file for the version and commit rather than assuming. Installing, supervising and fronting the process are the host's concerns and are configured there, not here.

## Guardrails — things that break correctness if ignored

- **`SQLITE_PATH` must be absolute.** [`getDbPath()`](src/lib/db.ts) rejects a missing or relative value when the first request opens the database. `/api/health` opens it, so a deploy checks that endpoint rather than treating a listening port as a working app; static pages keep serving either way. Don't default it, don't make it optional, don't fall back to cwd.

  This was a `runtime-config.ts` module, a `required-env.json` list and a shape test — 99 lines guarding one `path.isAbsolute` call, sized for the five env vars the Next era had. It also spent weeks calling nothing at all, because the caller lived in Next's deleted `instrumentation.ts`. The rule is worth keeping; the framework around it was not.

  It ran nowhere at all between the Astro migration and 2026-09-02: the call lived in Next's `instrumentation.ts`, that file was deleted, nothing replaced it, and the docs kept promising the check for weeks. If you move the call, prove it still fires by booting with the variable unset.
- **Editing a workflow means running `npm run lint:actions` before pushing.** It is not installed by npm — a Go binary, found on PATH or in `~/.local/bin` — so it reports SKIPPED rather than failing when a developer does not have it, and CI stays authoritative. That leniency is for developers who never touch `.github/`; it is not cover for the person editing the workflow. Discovering a shellcheck complaint by pushing is a round trip that was avoidable.

- **Prettier does not format `.astro`, and that is a decision, not an oversight.** `prettier-plugin-astro` rewrites rendered HTML rather than only source — it injects whitespace inside elements, turning `<a>Services</a>` into `<a> Services </a>`. Measured here: 4 built pages changed on default settings, 8 on `htmlWhitespaceSensitivity: "strict"`. A formatter that alters output cannot be run unattended. `.astro` is in `.prettierignore`; those files are still linted by `eslint-plugin-astro` and typechecked by `astro check`. If you add the plugin, diff `dist/client` before and after and look at what moved.
- **`HOST`, not `HOSTNAME`.** `@astrojs/node` reads `HOST` and `PORT`. `HOSTNAME` — which the Next-era env template documented — is read by nothing and fails silently. Unset, the server listens on `localhost:4321`.
- **Don't wrap route handlers in top-level try/catch.** A blanket catch turns a real fault into a generic 500 and drops the stack, which is the difference between a fixable report and "the form is broken sometimes." Let errors propagate; the adapter logs them with the stack intact. The email-send `try/catch` is the one legitimate catch — the row is already saved by then, so SMTP being down must not fail a submission that actually succeeded.
- **Don't add `output: "standalone"` back.** Next's static-trace machinery keeps tripping over custom server entrypoints + dynamic requires (v2.80.0–v2.83.0 in vis-daily-tracker were four consecutive bad releases). `next() + app.prepare()` works because the full Next module tree is present. If the static migration removes the custom server entirely this guardrail retires with it — until then it holds.
- **Bump Node major across both pins together.** `.nvmrc` and `package.json#engines.node` must agree; CI reads `.nvmrc` directly via `node-version-file`, so there is no third pin. The gate's "Verify Node major pins agree" step enforces it.
- **`better-sqlite3` is a native module.** Declared in [`astro.config.mjs`](astro.config.mjs)'s `vite.ssr.external` so the SSR build resolves it at runtime instead of trying to bundle it. Since v13 it is built on the N-API, so the prebuilt binary published with the package is ABI-stable across Node majors — bumping Node no longer invalidates the binding, which it did up to v12. It still compiles from source during `npm ci` where no prebuilt matches the platform, so a toolchain is needed wherever that happens.
