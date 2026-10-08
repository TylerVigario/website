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
  mailer
- `src/pages/**/*.ts` — the API routes and generated endpoints
- `scripts/`, `tests/`, `.github/`, and the build configuration
- the page structure and markup of `src/pages/**/*.astro`

Fork it, change it, run it. If you modify it and serve it over a
network, AGPL §13 obliges you to offer your users your modified source
in turn. That is the whole reason this licence was chosen.

## Reserved — © Vigario Technology Solutions, All Rights Reserved

**Brand and imagery.** `src/assets/images/` in full, apart from the
photographs under `stock/` (below), which are other people's — the VTS logo and symbol, the
social-sharing card, and every client screenshot under
`src/assets/images/work/`. Also every file in `public/`, which is the
logo mark in the formats browsers and home screens ask for:
`favicon.ico`, `apple-touch-icon.png`, `icon-192.png` and
`icon-512.png`. Those three PNGs replaced a `public/icon.svg`, which this
notice went on naming after it was gone, so the files that replaced it
were reserved nowhere.

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
- the privacy policy's text in `src/pages/privacy.astro`

This is the part that is not code with words in it. It is an account of
real engagements with named clients, written about work that was
actually done, and it is not a template. A fork gets the site and writes
its own.

## Not ours to grant

The GitHub and LinkedIn marks in `src/components/icons/` belong to
GitHub and LinkedIn. They label links to profiles on those sites, and
this licence grants neither. The glyph in `LinkedIn.astro` comes from
Bootstrap Icons, under MIT, and carries that notice in the file.

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

An earlier version of this project's README described the marketing copy
as "covered by AGPL" and then asked readers to lift the structure rather
than the content. A request is not a licence term. That sentence granted
the very thing it asked people not to take.
