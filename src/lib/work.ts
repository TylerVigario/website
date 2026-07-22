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
};

export const caseStudies: CaseStudy[] = [
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
  },
];
