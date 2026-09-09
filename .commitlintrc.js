// Angular Conventional Commits. Type carries release impact; scope says
// where in the codebase.
//
// THE TYPE SET IS NOT DECLARED HERE. @commitlint/config-conventional
// already ships the eleven Angular types, and restating them would be a
// second copy to keep in sync with upstream for no gain — the standard's
// rule 2 puts it as "no repository declares an enum, since declaring one
// restates a default." An earlier version of this file listed ten of the
// eleven, omitting `style`; `style` is now allowed and cliff.toml skips
// it, so it reaches neither the changelog nor a version bump.
//
// WHICH TYPES SHIP is cliff.toml's question, not this file's, and the
// line it draws is whether the artifact changed: feat, fix, revert,
// perf, refactor and build produce different bytes, so they are recorded
// and they bump; ci, docs, test, chore and style cannot reach the
// artifact, so they do neither. One parser list drives the changelog and
// --bumped-version together, which is why that split lives in one place.
//
// Only genuine overrides remain below. Rules that merely restated the
// inherited default (type-case, type-empty, subject-empty, subject-case,
// subject-full-stop) were deleted: identical behaviour, one less copy.
export default {
  extends: ["@commitlint/config-conventional"],

  rules: {
    // No inherited default exists for this one.
    "scope-case": [2, "always", "lower-case"],

    // 120 rather than the inherited 100. PR titles become main's commit
    // subject under squash, and a conventional type + scope eats into
    // the budget before the subject starts.
    "header-max-length": [2, "always", 120],

    // Escalated from warning to error — a body running into the subject
    // line is a malformed commit, not a style preference.
    "body-leading-blank": [2, "always"],

    // Off rather than the inherited 100. Bodies here carry reasoning and
    // occasional pasted output; hard-wrapping is the author's call.
    "body-max-line-length": [0],

    // footer-leading-blank dropped — the conventional-changelog parser
    // greedy-detects any line-start `Word:` in the body as a trailer
    // boundary, false-firing on natural prose ("What landed:", "Why:"). The
    // real protection (catching a missing blank before Co-Authored-By) is
    // ~zero — HEREDOC commit-message templates include the blank, and
    // git/cliff handle trailers leniently regardless.
    "footer-leading-blank": [0],
    "footer-max-line-length": [0],
  },
};
