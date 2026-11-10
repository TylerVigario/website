# Rulesets

`main.json` and `main-history.json` are the branch protection payloads for this
repository. They are committed because a ruleset is applied state that lives only on
GitHub: it vanishes silently on repository recreate, rename or fork, and nothing in a
clone reveals it is gone.

This repository learned that the expensive way. The ruleset was applied on 2026-07-26,
three days after the last release, and nothing in the tree recorded it. The next release
attempt — two weeks later — failed at `git push origin main` with

```text
remote: - Changes must be made through a pull request.
```

because the release job writes the branch and nothing had ever said the branch was
protected. The payload is committed now so that a change to protection is a change to
the repository, reviewable like any other.

`main.json` names one bypass actor: the `website-release` App (id 4810355),
owned by this account and installed on this repository alone. `version-tags.json`
names the same App and nothing else. `main-history.json` and `tags.json` name none.

The exemption exists for one reason: a release records itself, which means
writing the default branch, which nothing else may do. Its blast radius is the
App's own permissions, and those are `contents: write` and `metadata: read` —
verified against the App's own credential, not read off a form. Notably absent
is `workflows`, so an identity that bypasses branch protection still cannot
rewrite the workflows that gate this repository.

`main.json` requires every job in `ci.yml`, one context per check, and
`Validate PR title`. Those strings are job *names*, not workflow filenames, and
a required context naming no job wedges the branch on an answer that never
comes — every check green and nothing mergeable. A job no context names fails
the other way, and quietly: it runs, and its failure blocks nothing.
`tests/required-checks.test.ts` compares the two lists, so a job renamed or
added fails the tests until this file agrees. The names are checked against
what GitHub reports on a pull request, not only against the YAML, because
`Validate PR title` only runs on `pull_request` and never appears on a push to
`main`.

`Lint main`, in the same workflow, is not required and must not be. It runs
only on a push to `main`, so a pull request required to pass it would wait for
a result that never comes.

Each check also names `integration_id` 15368, the GitHub Actions app, read off
the check runs on `main` rather than assumed. Without it a check is satisfied by
anything that reports the right name: another App, or a commit status posted
with any token that can write statuses. With it, only a run of these workflows
counts.

`strict_required_status_checks_policy` is on, so a branch must be up to date
with `main` before it merges — the checks that passed are the checks for the
code that lands.

To change either: relax the rule, merge the change, tighten it again, then read
the applied state back.

`tags.json` protects every tag. `deletion` and `non_fast_forward` look like the
whole of it and are not: advancing a tag to a descendant commit is a fast-forward,
so neither rule objects, and one version quietly names two sets of bits. `update`
is what closes that — it refuses any move of a ref that already exists while still
admitting one that does not, making tags create-once.

The failure it prevents is silent on the side that suffers it. Advance a tag and
whoever fetches next gets the new content, while whoever already holds the name is
refused the update and never learns there was one. Two people at the same version,
holding different bits, neither told.

Every tag takes the pattern `refs/tags/**/*`. A ruleset matches with `FNM_PATHNAME`, so
`*` stops at `/`, and `**` alone matches no more than `*` does: under `refs/tags/*` or
`refs/tags/**`, a tag with a slash in its name is outside the ruleset, free to be moved,
forced and deleted by anything that can push. `**/*` matches at every depth, the top one
included. All three patterns were pushed at on a scratch repository. On this one, while
the file held `refs/tags/*`, GitHub's rule log shows a push of `v0/probe` checked against
none of its rules.

It carries no bypass actor, and that is deliberate. A bypass is scoped to a ruleset
rather than to a rule, so any actor listed here would be past `update` and
`deletion` as readily as anything else — an exemption from the only property this
ruleset exists to provide. A release creates tags and never moves them, so it needs
nothing withheld here.

The tags a release creates are lightweight: publishing the release creates its tag, so
`git cat-file -t` on one reports `commit`. `update` does not care which kind a tag is, so
the guarantee does not depend on annotated tags.

`creation` is not in it, and cannot be: the actor allowed to create would need a bypass,
and a bypass here would be past `update` and `deletion` too.

`version-tags.json` holds `creation` alone, on version tags, and lets only the
release App past it. Naming a version used to be open to anyone, on the reasoning
that a name nobody can change costs nothing to leave unguarded. It costs the branch.
A release that publishes and then fails to move `main` is finished by the next
dispatch, and the newest `v` tag is what tells that dispatch there is something to
finish; finishing moves `main` through the App's bypass, past the pull request, the
checks and code scanning. So with creation open, anything that can write the
repository's contents could push a tag on a commit of its own and have the owner's
next routine dispatch put that commit on `main`. And a tag nobody may delete, whose
parent is not `main`, refuses every release after it until protection is relaxed to
remove it. The release's `decide` job checks the commit it finishes regardless —
the App's, signed by GitHub, changing only the version and the changelog, with a
published release — so this ruleset is what keeps a stray version from existing at
all, and that check is what holds if the ruleset ever drifts.

Rulesets compose, and each carries its own bypass list, so the App is past `creation`
here and nothing in `tags.json`: a tag it creates is create-once like any other.

The two patterns are both needed. A ruleset's `*` stops at `/` here too, while
`git tag --list 'v*'`, which `decide` reads, matches across it, and sorts
`v9/x` above `v1.21.1`. `refs/tags/v*` alone leaves `v9/x` to anyone; `refs/tags/v*/**/*`
alone leaves `v9.0.0`; `refs/tags/v**` matches only what `v*` does. Each was pushed at on
a scratch repository before this file was written, with the owner refused and the bypass
actor admitted, by `git push`, by the refs API and by publishing a release.

The payload is written to **round-trip**: applying it and reading it back
yields the same rules, so any difference between this file and applied state
is real drift rather than noise. Two fields exist only for that reason.

`dismissal_restriction` is omitted. Its default-valued form
(`{enabled: false, allowed_actors: []}`) is not stored on a repository owned
by a user account — GitHub drops it even when sent verbatim — so keeping it
here would make every comparison report a difference that cannot be resolved.

`require_extra_approval_for_unattributed_changes` is present because GitHub
sets it whether or not the payload asks. A field the forge adds on its own has
to be in the file, or the file is permanently one field behind.

A comparison that always reports a difference is a comparison people stop
running.

The file is the source of truth. Apply it, do not hand-configure:

```bash
gh api repos/<owner>/<repo>/rulesets --method POST --input .github/rulesets/main.json   # create
gh api repos/<owner>/<repo>/rulesets/<id> --method PUT --input .github/rulesets/main.json # update
```

Read back what is actually enforced — from the **rules** endpoint, not the legacy
branch-protection API, which reports `enforcement_level: off` even where a ruleset is
demonstrably active:

```bash
gh api repos/<owner>/<repo>/rules/branches/main
```

A tag has no counterpart to that endpoint. Read a tag ruleset by its id, and check its
`conditions` as well as its `rules`: a pattern that misses is as absent as a missing rule.

```bash
gh api repos/<owner>/<repo>/rulesets/<id>
```

A read says what is configured, not that it bites. `tests/rulesets.test.ts` holds the
files to their shape; whether GitHub refuses is known only by pushing at it.

## Why each rule

`main.json` holds the rules a release commit cannot pass: the pull request, the
required checks and code scanning. `main-history.json` holds the ones a release never
needs to: `deletion`, `non_fast_forward` and `required_linear_history`. Both apply to
the default branch, and rulesets compose, so every change to it answers to both.

**`pull_request`, 0 approvals** — a single owner cannot approve their own pull request,
so requiring one deadlocks the repository outright. The pull request is the record; the
approval count adds nothing where there is one reviewer.

**`allowed_merge_methods: squash`** — no merge commits, and no rebase either. A second
parent buys nothing merging into linear history; rebase replays branch commits onto main
verbatim, so a check validating the pull request title never sees them.

**`deletion`, `non_fast_forward`** — the branch cannot be removed or rewritten, by
anyone, the release App included.

**`required_linear_history`** — not the same lever as disabling merge commits in the
repository settings. Merge methods are settings: one API call re-enables them, touching
no ruleset and leaving nothing in the ruleset history.

**`code_scanning`, CodeQL** — a pull request that brings in a security alert of high
severity or above, or an alert at error level, cannot merge, and none merges until
CodeQL has analysed it. The CodeQL check itself is not required, so without this rule
nothing it finds stops a merge. `codeql.yml` runs on every pull request for that reason. With a paths filter, a pull
request it skipped would have no analysis for the rule to read.

## `bypass_actors` — exactly one, and why

```json
{ "actor_id": 4810355, "actor_type": "Integration", "bypass_mode": "always" }
```

That is the **App ID** of `website-release`, installed on this repository only. It is not
the Client ID — rulesets identify actors by App ID, and a Client ID here does not resolve.
The whole `PUT` fails with 422 rather than the one line being rejected.

The App exists because this release **records itself**: it bumps `package.json`, writes
`CHANGELOG.md` and creates the tag by publishing the release, then fast-forwards `main` to
that commit. A release that cannot write the branch cannot leave a receipt in it, and
dropping the receipt to avoid a credential trades a durable property of the project for an
operational one.

**What it reaches, stated rather than implied.** `bypass_mode: always` applies to every
rule in the ruleset, not only `pull_request`, which is why `main.json` holds only the
three a release commit cannot pass. A release adds one commit to `main` by fast-forward
and never removes one, so the rules it has no use for are in `main-history.json`, which
names no bypass actor. The App can add a linear commit to `main`; it cannot delete the
branch, rewrite it or put a merge commit on it.

That was measured before the split, on a scratch repository, with the admin role in the
App's place, and payloads made from these. With the bypass on one ruleset holding all
six rules, the bypass actor landed a merge commit, forced the branch back twice and
deleted it. With the split, each of those was refused, and the release's own
`force=false` fast-forward went through. With the bypass removed, that fast-forward was
refused for the pull request, the required check and code scanning, so the bypass is
what admits it.

The App is also the one bypass actor of `version-tags.json`, which holds `creation` and
nothing else, so that exemption reaches no rule but the one it is for.

The App's credentials are not repository secrets. They live in the `release`
environment, which admits `main` alone, and only the release workflow's `publish` and
`finish` jobs name it: `publish` mints the token after the artifact is built, run and
attested, and `finish` only after `decide` has checked the commit it moves `main` to. A
workflow run on any other branch cannot reach them.

## Not included

No required reviewers on the `release` environment. A workflow on `main` that names the
environment can mint the App's token, and nothing puts a second person between a
dispatch and the write. Releases are dispatched by hand by the one owner, so a reviewer
would be that same person approving their own run, which GitHub allows unless
self-review is switched off. A reviewer is added when there is a second maintainer; until
then it is the remaining gap, accepted knowingly rather than overlooked.
