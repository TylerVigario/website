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

`creation` is deliberately absent: anyone may name a version, nobody may change one.

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

## `bypass_actors` — exactly one, and why

```json
{ "actor_id": 4497411, "actor_type": "Integration", "bypass_mode": "always" }
```

That is the **App ID** of `website-release`, installed on this repository only. It is not
the Client ID — rulesets identify actors by App ID, and a Client ID here does not resolve.
The whole `PUT` fails with 422 rather than the one line being rejected.

The App exists because this release **records itself**: it bumps `package.json`, writes
`CHANGELOG.md` and pushes the tag. A release that cannot write the branch cannot leave a
receipt in it, and dropping the receipt to avoid a credential trades a durable property
of the project for an operational one.

**What this costs, stated rather than implied.** `bypass_mode: always` applies to every
rule in the ruleset, not only `pull_request` — so this App is past `deletion` and
`non_fast_forward` too. Narrowing that means splitting protection into two rulesets, one
with the bypass and one without. Judged not worth the second apply step here; revisit if
the repository stops being single-owner.

There is no environment gate with required reviewers. greenroom-win has one because its
releases are dispatched by hand; this repository releases on merge, and a required
reviewer would stall every run. The consequence is that any workflow in this repository
can mint this App's token — which is the exposure that gate would close, accepted
knowingly.

## Not included

No tag ruleset yet. Tags here are records of what shipped rather than build inputs — the
RPM is built from the commit and tagged afterwards — but a version that can be repointed
at different bits is the same defect one step later, so `refs/tags/v*` with `deletion`
and `non_fast_forward` is worth adding. Note those two block re-pointing an *annotated*
tag; a lightweight tag moved to a descendant is a fast-forward and slips through, so it
rests on `git tag -a`, which the release workflow uses.
