# Rulesets

`main.json` is the branch protection payload for this repository. It is committed
because a ruleset is applied state that lives only on GitHub: it vanishes silently on
repository recreate, rename or fork, and nothing in a clone reveals it is gone.

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
owned by this account and installed on this repository alone.

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

It carries no bypass actor, and that is deliberate. A bypass is scoped to a ruleset
rather than to a rule, so any actor listed here would be past `update` and
`deletion` as readily as anything else — an exemption from the only property this
ruleset exists to provide. A release creates tags and never moves them, so it needs
nothing withheld here.

The tags a release creates are lightweight: publishing the release creates its tag, so
`git cat-file -t` on one reports `commit`. `update` does not care which kind a tag is, so
the guarantee does not depend on annotated tags.

`creation` is deliberately absent: anyone may name a version, nobody may change one.

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

## Why each rule

**`pull_request`, 0 approvals** — a single owner cannot approve their own pull request,
so requiring one deadlocks the repository outright. The pull request is the record; the
approval count adds nothing where there is one reviewer.

**`allowed_merge_methods: squash`** — no merge commits, and no rebase either. A second
parent buys nothing merging into linear history; rebase replays branch commits onto main
verbatim, so a check validating the pull request title never sees them.

**`deletion`, `non_fast_forward`** — the branch cannot be removed or rewritten.

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

**What this costs, stated rather than implied.** `bypass_mode: always` applies to every
rule in the ruleset, not only `pull_request` — so this App is past `deletion` and
`non_fast_forward` too. Narrowing that means splitting protection into two rulesets, one
with the bypass and one without. Judged not worth the second apply step here; revisit if
the repository stops being single-owner.

The App's credentials are not repository secrets. They live in the `release`
environment, which admits `main` alone, and only the release workflow's `publish` job
names it, minting the token after the artifact is built, run and attested. A workflow
run on any other branch cannot reach them.

## Not included

No required reviewers on the `release` environment. A workflow on `main` that names the
environment can mint the App's token, and nothing puts a second person between a
dispatch and the write. Releases are dispatched by hand by the one owner, so a reviewer
would be that same person approving their own run, which GitHub allows unless
self-review is switched off. A reviewer is added when there is a second maintainer; until
then it is the remaining gap, accepted knowingly rather than overlooked.
