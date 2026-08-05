"use client";

import { useState } from "react";
import Image from "next/image";
import FadeIn from "@/components/FadeIn";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";

type Shot = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  sizes: string;
};

// Every iTaleSoWell screenshot, in viewer order: the four reader-facing desktop
// views, the two phone views, then the six back-office views. Each page section
// renders a slice, but the lightbox carries the whole set, so you can page
// through all twelve from any grid.
const shots: Shot[] = [
  {
    src: "/images/work/italesowell/now-showing.webp",
    alt: "The Now Showing section of iTaleSoWell: eight poster cards, each with cover art, rating, runtime and a one-line logline",
    caption:
      "Now Showing — the newest eight, each with its rating, runtime and the logline that has to sell it.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/library.webp",
    alt: "The Library page: filter rail for showtime, length and genre beside a list of tales, each showing cover, metadata and its opening paragraph",
    caption:
      "The Library — filters live in a rail; every tale leads with its own first paragraph rather than a blurb.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/reader.webp",
    alt: "A tale open in the reader: warm serif prose on near-black, a chapter heading, and a toolbar with scroll or page mode, chapters, text size and ePub download",
    caption:
      "The reader — scroll or page-turns, a chapter index, text size, and an ePub for every tale.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/signup.webp",
    alt: "The Never Miss a Showing section: a single email field promising one short tale a week, with a one-click way out",
    caption:
      "The one conversion on the front page — an audience the author owns, rather than one a platform lends him.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/mobile-reader.webp",
    alt: "A tale being read on a phone: serif prose at a comfortable measure with a compact sticky toolbar",
    caption:
      "Reading on a phone — a capped measure, a sticky toolbar, and a progress bar that survives a font change.",
    width: 1179,
    height: 1980,
    sizes: "(min-width: 640px) 24rem, 100vw",
  },
  {
    src: "/images/work/italesowell/mobile-library.webp",
    alt: "The Library on a phone with the filter panel opened, showing showtime, length and genre chips with counts",
    caption:
      "The same filters on a phone — folded behind one control, so the first tale is half a screen away.",
    width: 1179,
    height: 1980,
    sizes: "(min-width: 640px) 24rem, 100vw",
  },
  {
    src: "/images/work/italesowell/admin-overview.webp",
    alt: "The admin overview: a weekly reads figure with an eight-week sparkline, four channel cards with the author's own site marked as his, subscriber counts, and a ranked list of tales with stacked bars showing where each one was read",
    caption:
      "The overview ranks rather than totals, and reports movement in people — at these numbers a percentage would be theatre.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/admin-tales.webp",
    alt: "The admin tales list: a filter rail with status and needs-work chips carrying counts, beside a table of tales showing status, rating, shelf, genre, runtime and reads",
    caption:
      "One list, no tabs. Each chip's number is what you would get by clicking it, so a dead end is greyed before it wastes a tap.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/admin-editor.webp",
    alt: "The tale editor: a toolbar reading Chapter, Break, Scene, then bold, italic and underline, above serif manuscript text with a chapter heading and a scene divider",
    caption:
      "The editor speaks the writer's vocabulary — Chapter, Break, Scene — not a word processor's.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/admin-taxonomy.webp",
    alt: "The taxonomy page: words grouped by genre, flavour, content warnings and collections, each showing how many tales use it and whether it is public or held",
    caption:
      "New words arrive held — usable the moment they are invented, invisible to readers until promoted.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/admin-sends.webp",
    alt: "The sends tab: an automatic on-release send toggled on, a frequency cap of one per seven days, a delivery hour, and the record of a broadcast with delivered, clicked and bounced counts",
    caption:
      "Publishing a tale is the send. A frequency cap and a delivery hour keep an automatic list from behaving like a bot.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/italesowell/admin-editor-phone.webp",
    alt: "The same tale editor on a phone: the toolbar collapsed to single-character icons above the manuscript text",
    caption:
      "The same editor on the device he actually writes on — the toolbar collapses to icons rather than wrapping.",
    width: 1179,
    height: 1980,
    sizes: "(min-width: 640px) 24rem, 100vw",
  },
];

export default function Screenshots({
  from,
  to,
  className,
}: {
  from: number;
  to: number;
  className?: string;
}) {
  // -1 is closed. One piece of state rather than an open flag plus an index,
  // which is the shape /work/pipetree uses — two of them cannot disagree.
  const [index, setIndex] = useState(-1);
  const slice = shots.slice(from, to);

  return (
    <>
      <div className={className}>
        {slice.map((s, i) => (
          <FadeIn key={s.src} animation="fade-in" delay={i * 0.1}>
            <button
              type="button"
              onClick={() => setIndex(from + i)}
              className="group block w-full overflow-hidden rounded-xl border border-border bg-surface-light text-left shadow-lg transition-shadow hover:shadow-xl"
            >
              <Image
                src={s.src}
                alt={s.alt}
                width={s.width}
                height={s.height}
                sizes={s.sizes}
                className="w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <p className="border-t border-border p-4 text-sm text-muted leading-relaxed">
                {s.caption}
              </p>
            </button>
          </FadeIn>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        on={{ view: ({ index: current }) => setIndex(current) }}
        slides={shots.map((s) => ({
          src: s.src,
          alt: s.alt,
          width: s.width,
          height: s.height,
          description: s.caption,
        }))}
        plugins={[Zoom, Captions, Counter]}
        captions={{ descriptionTextAlign: "center" }}
      />
    </>
  );
}
