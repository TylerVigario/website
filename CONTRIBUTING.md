# Contributing

Thanks for the interest. A few things up front:

- This is the website for Vigario Technology Solutions — a small project driven by one maintainer, its code given freely. Issues and pull requests are welcome, but priorities and direction are set by what the business needs next. Bug reports and security issues get faster attention than adjacent feature work.
- The **source code** is licensed [AGPL-3.0-or-later](LICENSE). By submitting a contribution you agree to license it under the same terms — no CLA, no copyright assignment.
- The **brand imagery** and the **written content** are All Rights Reserved and **not** part of the AGPL grant; [LICENSE-NOTICE.md](LICENSE-NOTICE.md) draws the boundary path by path. Don't submit changes to either; a fork meant for your own use supplies its own.
- There's no team handle, Slack, or Discord. The conversation lives in GitHub issues and pull requests.

## Reporting a bug or suggesting a change

Open a [GitHub issue](https://github.com/TylerVigario/website/issues/new/choose) and pick the form that fits: one for something wrong, one for something that should work differently. Each asks for what it needs. Describe the problem, not a proposed fix.

## Reporting a security issue

**Don't open a public issue.** Use the private process in [SECURITY.md](SECURITY.md).

## Dev environment

Node is pinned in [`.nvmrc`](.nvmrc) — use whatever version manager you prefer.

```bash
cp .env.example .env.local   # SQLITE_PATH at minimum (must be an absolute path)
mkdir -p data                # gitignored
npm ci
npm run dev
```

`npm run build && npm run preview` runs the built server, the entrypoint production runs, though without the proxy production puts in front of it — worth doing before opening a PR that touches an `/api` route, since `npm run dev` and the built server are different processes. See [README.md](README.md) for more, and [CLAUDE.md](CLAUDE.md) for the vocabulary and guardrails.

## Branching, commits, and PRs

These mirror [CLAUDE.md](CLAUDE.md)'s "Git + PR workflow" — that's the source of truth; the short version:

- **Branch off `main`** as `<type>/<slug>` (enforced by `.husky/pre-push`). No direct commits to `main`.
- **Conventional Commits**: the type is the release decision, and the line is whether the artifact changed; CLAUDE.md says which types bump. A CI-infra fix is `ci:`, not `fix(ci):`. `commitlint` enforces the message on commit.
- **PR titles must be conventional** — the repo squash-merges, so the title becomes the commit on `main`, and a CI check (`commit-convention.yml`) validates it. Iterate on review with additive commits; the per-commit history is squashed away on merge.

## Code style & testing

- Prettier (100 col, double quotes, semicolons) and ESLint (type-aware) — `npm run format` and `npm run lint`.
- `req.json()` is `any`; always parse through a zod schema in `src/lib/api/`.
- `npm run ci` is the gate in one command, and the hooks run all of it between them. Tests are Vitest: `npm test`.

The pre-commit and pre-push hooks run these automatically; CI is the backstop.
