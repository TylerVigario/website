# What this licence covers

`LICENSE` is the verbatim AGPL-3.0-or-later text. Everything in this
repository is granted under it except what this file names: two
categories that are the business's own and are **not** granted, and what
belongs to other people. They are named path by path, so nobody has to
infer the line from a directory layout that can move, and a file nobody
thought to list is granted, not left out.

## Granted under AGPL-3.0-or-later

Copyright © 2026 Vigario Technology Solutions, licensed under the GNU
Affero General Public License, version 3 or, at your option, any later
version.

Everything not named in the two sections below. That is the machinery,
everything that would still be useful with different words and
different pictures in it, among it:

- `src/components/`, `src/layouts/`, `src/scripts/`, `src/styles/`
- `src/lib/` — the form pipeline, validation schemas, database access,
  mailer
- `src/emails/` — the notification emails
- `src/pages/**/*.ts` — the API routes and generated endpoints
- the page structure and markup of `src/pages/**/*.astro`
- `scripts/`, `tests/`, `.github/`, `.husky/`, the build configuration,
  and the documentation

Fork it, change it, run it. If you modify it and serve it over a
network, AGPL §13 obliges you to offer your users your modified source
in turn. That is the whole reason this licence was chosen.

## Reserved — © Vigario Technology Solutions, All Rights Reserved

What says who the business is and what it has done. Granted, it would
let someone else present the business's work as their own: say they
built Pipetree, or that they helped Bravo Farms move from POTS lines to
VoIP, under the business's logo.

**Brand and imagery.** The name Vigario Technology Solutions, VTS, the
logo, and the founder's name and likeness: this licence grants no right
to use any of them, under trademark law (AGPL §7(e)) or otherwise, and a
fork runs under its own name. `src/assets/images/` in full, apart from the
photographs under `stock/` and the Bravo Farms logo, which are other
people's (below) — the VTS logo, the social-sharing card, and every
client screenshot under `src/assets/images/work/`. Also every file in
`public/`, which is the logo mark in the formats browsers and home
screens ask for: `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`
and `icon-512.png`. The reservation follows the files, not the path.

**Written content.** The prose, not the markup that arranges it:

- the case studies in `src/pages/work/`, their summaries in
  `src/pages/work.astro`, their entries in `src/lib/work.ts`, and the
  captions and descriptions of their screenshots in
  `src/components/ItalesowellScreenshots.astro` and
  `src/components/PipetreeScreenshots.astro`
- service descriptions in `src/lib/services.ts`, `src/pages/services.astro`,
  `src/pages/services/` and `src/components/Services.astro`
- the POTS migration copy in `src/components/POTSLanding.astro` and
  `src/pages/pots-migration.astro`
- the about, hero, and call-to-action copy, in `src/pages/index.astro`,
  `src/components/Hero.astro`, `src/pages/about.astro` and
  `src/components/About.astro`, and on each page above
- the privacy policy's text in `src/pages/privacy.astro`

And wherever else the site speaks for the business: what it has done and
for whom, what it offers, and who it is. That text is reserved wherever
it sits, in a file this list names or not.

This is the part that is not code with words in it. It is an account of
real engagements with named clients, written about work that was
actually done, and it is not a template. A fork gets the site and writes
its own.

## Not ours to grant

The GitHub and LinkedIn marks in `src/components/icons/` belong to
GitHub and LinkedIn. They label links to profiles on those sites, and
this licence grants neither. The glyph in `LinkedIn.astro` comes from
Bootstrap Icons, under MIT, and carries that notice in the file.

The Bravo Farms logo, `src/assets/images/work/voip/bravo-farms-logo.png`,
belongs to Bravo Farms. It names the client beside the work done for
them, and this licence grants nothing in it.

The photograph behind the homepage hero,
`src/assets/images/stock/blue-cables-switch.jpg`, is by Scott Rodgerson
(<https://unsplash.com/photos/PSpf_XgOM5w>), used under the Unsplash
License (<https://unsplash.com/license>), which allows commercial use
without credit. It is credited here anyway, it is not reserved above,
and this licence grants nothing in it.

The two photographs of Bravo Farms are used under Creative Commons
Attribution 2.0 (<https://creativecommons.org/licenses/by/2.0/>),
resized, cropped on the page, and credited beside each place they
appear:

- `src/assets/images/stock/bravo-farms-traver.jpg`, "Bravo Farms ~
  Traver, California" by Thank You (25 Millions ) views
  (<https://www.flickr.com/photos/prayitnophotography/51422967173/>)
- `src/assets/images/stock/bravo-farms-kettleman-city.jpg`, "Bravo Farms,
  Kettleman City" by kennejima
  (<https://www.flickr.com/photos/kennejima/29184982401/>)

They are not reserved above, this licence grants nothing in them, and
their licence is theirs to pass on, not ours.

The site is set in Geist, by Vercel, under the SIL Open Font License
1.1. Its font files are served with every page and are not in this
repository; they come from `@fontsource-variable/geist` when the site is
built.

A release carries other people's code. The server is one bundle with its
npm dependencies compiled in, each under its own licence, nearly all
MIT or ISC. The build lists every one of them, with its version, licence
and licence text, in `dist/server/THIRD-PARTY-LICENSES.md`, which ships
in each release tarball beside the bundle. Geist is listed there too.
`better-sqlite3`, which cannot be bundled, ships in `node_modules/` as
its binary and the code that loads it, with its own licence file, and
the release lists it in the same file, with the SQLite compiled into its
binary, which is in the public domain. This licence grants nothing in any of them.

Two photographs on /services are in the public domain, dedicated under
CC0 1.0 (<https://creativecommons.org/publicdomain/zero/1.0/>), which
asks for no credit. They are named here so that nobody reads them as
ours:

- `src/assets/images/stock/network-patch-cables.jpg`, "Free networking
  cables image", rawpixel
  (<https://www.rawpixel.com/image/5919227/image-background-public-domain-technology>)
- `src/assets/images/stock/security-camera-wall.jpg`, "Surveillance
  camera shadow" by Siarhei Horbach, via Wikimedia Commons
  (<https://commons.wikimedia.org/wiki/File:Surveillance_camera_shadow_(Unsplash).jpg>)

## Why the distinction is drawn rather than implied

Copyright in the content is held regardless of what any file says; a
licence is a grant, and what is not granted is reserved. But an
unstated reservation inside a repository published under a copyleft
licence reads as an oversight, and a reader acting in good faith should
not have to guess where the line is.
