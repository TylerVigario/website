# What this licence covers

`LICENSE` is the verbatim AGPL-3.0-or-later text and governs **the
software**. Two categories are reserved and are **not** granted under
it. This file states which is which, so nobody has to infer it from a
directory layout that can move.

## Granted under AGPL-3.0-or-later

The machinery. Everything that would still be useful with different
words and different pictures in it:

- `src/components/`, `src/layouts/`, `src/scripts/`, `src/styles/`
- `src/lib/` — the form pipeline, validation schemas, database access,
  mailer, runtime config
- `src/pages/**/*.ts` — the API routes and generated endpoints
- `scripts/`, `tests/`, `.github/`, and the build configuration
- the page structure and markup of `src/pages/**/*.astro`

Fork it, change it, run it. If you modify it and serve it over a
network, AGPL §13 obliges you to offer your users your modified source
in turn. That is the whole reason this licence was chosen.

## Reserved — © Vigario Technology Solutions, All Rights Reserved

**Brand and imagery.** `src/assets/images/` in full — the VTS logo and
symbol, the hero image, and every client screenshot under
`src/assets/images/work/`. Also `public/favicon.ico` and
`public/icon.svg`, which are the logo in another format.

These moved from `public/images/` when the site was rebuilt on Astro, so
that they could be processed at build time. An earlier version of this
notice reserved `public/images/`, which is now empty — the reservation
follows the files, not the path.

**Written content.** The prose, not the markup that arranges it:

- the case studies in `src/pages/work/` and their entries in
  `src/lib/work.ts`
- service descriptions in `src/lib/services.ts` and `src/pages/services/`
- the POTS migration copy in `src/components/POTSLanding.astro` and
  `src/pages/pots-migration.astro`
- the about, hero, and call-to-action copy

This is the part that is not code with words in it. It is an account of
real engagements with named clients, written about work that was
actually done, and it is not a template. A fork gets the site and writes
its own.

## Why the distinction is drawn rather than implied

Copyright in the content is held regardless of what any file says; a
licence is a grant, and what is not granted is reserved. But an
unstated reservation inside a repository published under a copyleft
licence reads as an oversight, and a reader acting in good faith should
not have to guess where the line is.

An earlier version of this project's README described the marketing copy
as "covered by AGPL" and then asked readers to lift the structure rather
than the content. A request is not a licence term. That sentence granted
the very thing it asked people not to take.
