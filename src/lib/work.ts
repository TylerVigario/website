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
    before: string;
    after: string;
    caption: string;
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
    preview: "/images/work/italesowell/hero.webp",
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
    preview: "/images/work/pipetree/addresses-full.webp",
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
      logo: "/images/work/voip/bravo-farms-logo.png",
      logoAlt: "Bravo Farms",
      before: "$945/mo",
      after: "under $50/mo",
      caption: "FCC complaint won in 15 days · $10k+/yr saved",
    },
  },
];
