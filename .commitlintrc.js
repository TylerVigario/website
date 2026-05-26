// Angular Conventional Commits type set. Type carries release impact;
// scope says where in the codebase. cliff.toml's parser only bumps
// versions on `feat`, `fix`, and `revert` — every other type is
// no-release. Matches pipetree's set (the canonical sibling).
//
// Bumping vs skipping:
//   feat      → minor bump, "Features"
//   fix       → patch bump, "Bug Fixes"
//   revert    → patch bump, "Bug Fixes" (a revert ships a behavior change
//               from the user's perspective, even if the commit is
//               undoing something)
//   refactor  → no bump, skipped from changelog (per the CC spec,
//               refactors are behavior-preserving — if it changes
//               behavior, it's a feat or fix, not a refactor)
//   perf      → no bump (perf is technically observable but this repo
//               doesn't ship perf-only releases; treat as refactor)
//   ci        → no bump, CI infrastructure
//   build     → no bump, build system + dep packaging
//   docs      → no bump
//   test      → no bump
//   chore     → no bump (release bot, miscellaneous)
//
// Why Angular over the prior minimalist 6-type set: the 6-set forced
// CI-infrastructure changes into one of `chore(ci)`, `refactor(ci)`,
// or `fix(ci)`, with no semantic difference between them but very
// different release behavior (refactor and fix bumped, chore didn't).
// Angular's broader set lets each commit's release impact be implicit
// from its TYPE alone — `ci:` is unambiguously non-product.
export default {
  extends: ["@commitlint/config-conventional"],

  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "perf", "revert", "ci", "build", "docs", "test", "chore"],
    ],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],

    "scope-case": [2, "always", "lower-case"],

    "subject-empty": [2, "never"],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-full-stop": [2, "never", "."],

    "header-max-length": [2, "always", 120],

    "body-leading-blank": [2, "always"],
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
