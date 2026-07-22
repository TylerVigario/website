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

// Every pipetree screenshot, in viewer order: the four desktop views, then the
// two phone views. Each page section renders a slice of this list, but the
// lightbox always carries the whole set — so you can page through all six from
// either grid without merging the sections themselves.
const shots: Shot[] = [
  {
    src: "/images/work/pipetree/project-mainline.webp",
    alt: "Pipetree project Mainline tab: segments-clear progress bar, diagnostic filter chips, and mainline segment rows flagged as blocked on PM review",
    caption:
      "The Mainline tab — segment completeness at a glance, with diagnostic tags a PM clears inline.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/pipetree/project-addresses.webp",
    alt: "Pipetree project Addresses tab: per-address completion stats and diagnostics like unlinked laterals and branches that did not reach a terminal",
    caption:
      "The Addresses tab — every address gets its own topology and completeness diagnostics, filterable by issue.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/pipetree/submission-editor.webp",
    alt: "Pipetree submission view: a daily crew submission with a mainline inspection, its tap list at footages, and typed lateral inspection entries",
    caption:
      "A daily submission — a mainline run with its taps at footage, and the typed lateral entries that hang off it.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/pipetree/project-overview.webp",
    alt: "Pipetree project Overview tab: project pace metrics, completion percentage, and per-operator footage contributions",
    caption: "The Overview tab — project pace, completion, and per-operator contributions.",
    width: 2400,
    height: 1500,
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/work/pipetree/mobile-draft-form.webp",
    alt: "Pipetree mainline inspection entry form on a phone: from and to access points, direction, distance, pass/review/fail result, and notes",
    caption:
      "A mainline run entered from the truck — typed fields, suggestions over gates, auto-saved as a draft every two seconds.",
    width: 1179,
    height: 1980,
    sizes: "(min-width: 640px) 24rem, 100vw",
  },
  {
    src: "/images/work/pipetree/mobile-entry-picker.webp",
    alt: "Pipetree Add Entry picker on a phone: searchable entry kinds grouped into inspections and requests, each with a type badge",
    caption:
      "Add Entry on a phone — every entry kind the trade actually files, grouped and searchable.",
    width: 1179,
    height: 1980,
    sizes: "(min-width: 640px) 24rem, 100vw",
  },
];

const plugins = [Zoom, Captions, Counter];

export default function Screenshots({
  from,
  to,
  className,
}: {
  from: number;
  to: number;
  className: string;
}) {
  const [index, setIndex] = useState(-1);

  return (
    <>
      <div className={className}>
        {shots.slice(from, to).map((shot, i) => {
          const at = from + i;
          return (
            <FadeIn key={shot.src} animation="fade-in" delay={i * 0.1}>
              <figure className="overflow-hidden rounded-xl border border-border bg-surface-light">
                <button
                  type="button"
                  onClick={() => setIndex(at)}
                  aria-label={`View full screenshot: ${shot.alt}`}
                  className="group block w-full cursor-zoom-in"
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    sizes={shot.sizes}
                    className="w-full border-b border-border transition-opacity group-hover:opacity-90"
                  />
                </button>
                <figcaption className="p-4 text-sm text-muted leading-relaxed">
                  {shot.caption}
                </figcaption>
              </figure>
            </FadeIn>
          );
        })}
      </div>

      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        on={{ view: ({ index: current }) => setIndex(current) }}
        slides={shots.map((shot) => ({
          src: shot.src,
          alt: shot.alt,
          width: shot.width,
          height: shot.height,
          description: shot.caption,
        }))}
        plugins={plugins}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        captions={{ descriptionTextAlign: "center" }}
        styles={{ container: { backgroundColor: "rgba(0, 0, 0, 0.92)" } }}
      />
    </>
  );
}
