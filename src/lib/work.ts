import { bravoFarmsKettlemanCity, bravoFarmsTraver, type CreditedPhoto } from "@/lib/photos";

// Single source of truth for the /work index and any nav that lists case
// studies. Each full case study lives at its own route under /work/<slug>;
// this module carries only the summary metadata the index cards render.

export type CaseStudy = {
  slug: string;
  href: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  year: string;
  status: string;
  lastModified: string;
  preview?: string;
  outcome?: {
    logo: string;
    logoAlt: string;
    /** Struck through beside `after`; left out when there is no "before". */
    before?: string;
    after: string;
    caption: string;
    /** Faded in behind the logo. In a hero the panel credits it itself;
     *  /work credits the cards' under the grid, since a card is a link. */
    backdrop?: CreditedPhoto;
  };
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "italesowell",
    href: "/work/italesowell",
    title: "iTaleSoWell",
    category: "Creator platform",
    summary:
      "Dark short fiction by Aniken D. Robinson, scattered across five platforms that each owned a slice of his audience. VTS built him an address of his own \u2014 a masked host, twenty tales with cover art and an ePub apiece, a reader built for phones, a mailing list nobody can throttle, and the back office he runs all of it from.",
    tags: ["Static site", "Editorial back office", "ePub generation", "Wattpad sync", "SES"],
    year: "2026",
    status: "Live",
    lastModified: "2026-08-04",
    // Path relative to src/assets/images, resolved to a build-time
    // import by the page so Astro can size it. Not a public URL.
    preview: "work/italesowell/hero.webp",
  },
  {
    slug: "pipetree",
    href: "/work/pipetree",
    title: "Pipetree",
    category: "Custom software",
    summary:
      "An operations platform for crossbore CCTV pipe inspection. Operators enter typed field data; the system derives a live infrastructure graph; project managers resolve problems inline on the graph. In production daily since early 2026, released open source under AGPL.",
    tags: ["Next.js", "PostgreSQL", "PWA", "Self-hosted", "Open source"],
    year: "2026",
    status: "In production",
    lastModified: "2026-07-17",
    preview: "work/pipetree/addresses-full.webp",
  },
  {
    slug: "voip",
    href: "/work/voip",
    title: "POTS-to-VoIP Migration",
    category: "Telecom advocacy",
    summary:
      "A 47-year AT&T customer was paying ~$945/month for copper POTS lines and got hit with an unauthorized $5,000 contract when they tried to leave. VTS ran the audit, built the case, won an FCC complaint in 15 days, and migrated them to VoIP for a fraction of the cost.",
    tags: ["Telecom audit", "FCC advocacy", "VoIP", "Number porting"],
    year: "2026",
    status: "Client engagement",
    lastModified: "2026-07-22",
    outcome: {
      logo: "work/voip/bravo-farms-logo.png",
      logoAlt: "Bravo Farms",
      before: "$945/mo",
      after: "under $50/mo",
      caption: "FCC complaint won in 15 days · $10k+/yr saved",
      backdrop: bravoFarmsTraver,
    },
  },
  {
    slug: "bravo-farms",
    href: "/work/bravo-farms",
    title: "Bravo Farms",
    category: "Managed IT",
    summary:
      "A family business since 1979, with two stores. VTS has looked after its IT since 2021: sixteen machines under remote management, register backups verified before they go off-site, the phones, the online store, and a written record of how each store actually works.",
    tags: ["Remote management", "Verified backups", "Point of sale", "VoIP", "Online store"],
    year: "2021–",
    status: "Ongoing",
    lastModified: "2026-10-07",
    outcome: {
      logo: "work/voip/bravo-farms-logo.png",
      logoAlt: "Bravo Farms",
      after: "Since 2021",
      caption: "2 stores · 16 machines · backups verified off-site",
      backdrop: bravoFarmsKettlemanCity,
    },
  },
];

// Work that is real but not finished: shown so the range is visible,
// labelled so nobody mistakes it for a shipped product. Each moves to
// caseStudies, with a page, when it ships.
export type Project = {
  title: string;
  category: string;
  summary: string;
  status: string;
  tags: string[];
  /** The public source, when there is one. */
  href?: string;
};

export const projects: Project[] = [
  {
    title: "reckon",
    category: "Custom software",
    summary:
      "Invoicing and time tracking for a small trade business, self-hosted, with the books, invoices and timesheets kept in agreement by the database itself.",
    status: "In development",
    tags: ["SvelteKit", "PostgreSQL", "Self-hosted", "Open source"],
    href: "https://github.com/TylerVigario/reckon",
  },
  {
    title: "Turf Tracker",
    category: "Custom software",
    summary:
      "A phone app for lawn and garden care: your soil test and product list in, the exact dose out, and every application logged with one tap.",
    status: "In development",
    tags: ["PWA", "Next.js", "PostgreSQL", "Self-hosted"],
  },
];
