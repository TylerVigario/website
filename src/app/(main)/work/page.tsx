import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import { caseStudies } from "@/lib/work";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies from Vigario Technology Solutions — custom field-operations software and telecom advocacy that saved a Central Valley family business five figures.",
  alternates: {
    canonical: "https://tylervigario.com/work",
  },
  openGraph: {
    title: "Work | Vigario Technology Solutions",
    description:
      "Case studies from Vigario Technology Solutions — custom field-operations software and telecom advocacy for Central Valley businesses.",
    url: "https://tylervigario.com/work",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://tylervigario.com/work#collection",
  name: "Work — Vigario Technology Solutions",
  url: "https://tylervigario.com/work",
  about: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
    name: "Vigario Technology Solutions",
  },
  hasPart: caseStudies.map((cs) => ({
    "@type": "CreativeWork",
    name: cs.title,
    url: `https://tylervigario.com${cs.href}`,
    abstract: cs.summary,
  })),
};

export default function WorkPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-12 lg:pb-16 lg:pt-36">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up" margin="0px">
            <p className="text-sm font-medium text-accent">Case studies</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              Work
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted leading-relaxed">
              A few engagements where VTS built &mdash; or fought for &mdash; something real, from
              custom field-operations software to telecom advocacy that saved a family business five
              figures.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Case-study cards */}
      <section className="pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {caseStudies.map((cs, i) => (
              <FadeIn key={cs.slug} animation="fade-in" delay={i * 0.1}>
                <Link
                  href={cs.href}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface-light p-6 transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg sm:p-8"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-accent">{cs.category}</span>
                    <span className="hidden text-border sm:inline" aria-hidden="true">
                      |
                    </span>
                    <span className="text-sm text-muted">
                      {cs.status} &middot; {cs.year}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-navy">{cs.title}</h2>
                  <p className="mt-3 flex-1 text-muted leading-relaxed">{cs.summary}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {cs.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors group-hover:text-accent-bright">
                    Read the case study
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
