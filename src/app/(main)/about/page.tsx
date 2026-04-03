import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "About Tyler Vigario",
  description:
    "20+ years in tech, from pulling cable to writing custom software. Tyler Vigario founded VTS in 2021 to bring full-stack IT expertise to Central Valley businesses.",
  alternates: {
    canonical: "https://tylervigario.com/about",
  },
  openGraph: {
    title: "About Tyler Vigario | Vigario Technology Solutions",
    description:
      "20+ years in tech, from pulling cable to writing custom software. Tyler Vigario founded VTS in 2021 to bring full-stack IT expertise to Central Valley businesses.",
    url: "https://tylervigario.com/about",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://tylervigario.com/about#person",
  name: "Tyler Vigario",
  jobTitle: "Founder & IT Consultant",
  worksFor: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
    name: "Vigario Technology Solutions",
  },
  knowsAbout: [
    "Network Infrastructure",
    "System Engineering",
    "Video Surveillance",
    "Structured Cabling",
    "Custom Software Development",
    "VoIP & Telecom",
    "Server Administration",
  ],
  url: "https://tylervigario.com/about",
  sameAs: ["https://github.com/tylervigario"],
};

const credentials = [
  { value: "Since 2005", label: "20+ Years in Tech" },
  { value: "Full Stack", label: "Software to Infrastructure" },
  { value: "Founder-Led", label: "Real Accountability" },
  { value: "Central Valley", label: "On-Site & Remote" },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Story */}
      <section className="pt-32 pb-16 lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
            {/* Left — story (2/3) */}
            <FadeIn className="lg:col-span-2" margin="0px">
              <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
                We build. We don&apos;t resell.
              </h1>

              <div className="mt-8 space-y-5">
                <p className="text-lg leading-relaxed text-muted">
                  VTS launched in 2021, but our founder&apos;s been in the
                  game since 2005 &mdash; starting with web and server work. Clients
                  like{" "}
                  <a href="https://bravofarms.com" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline decoration-accent/30 hover:text-accent transition-colors">Bravo Farms</a>{" "}
                  kept asking for more &mdash; networking, security cameras,
                  structured cabling &mdash; so we invested in the tools and
                  training to do it all properly. Most IT shops don&apos;t write
                  software, and most dev shops don&apos;t pull cable. We do both.
                </p>

                <p className="text-lg leading-relaxed text-muted">
                  Every project is led by our founder, who&apos;s been hands-on
                  in tech since age 14. That means real accountability &mdash; not
                  a rotating cast of contractors who don&apos;t know your setup.
                </p>

                <p className="text-lg leading-relaxed text-muted">
                  We&apos;re not a vendor collecting a toll &mdash; we&apos;re
                  builders who stake our name on every project. No layers, no
                  ticket queues, no runaround.
                </p>
              </div>
            </FadeIn>

            {/* Right — credentials (1/3) */}
            <FadeIn delay={0.2} className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:content-start" margin="0px">
              {credentials.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-surface-light p-4 text-center lg:p-5"
                >
                  <div className="text-lg font-bold text-accent sm:text-xl">{c.value}</div>
                  <div className="mt-1 text-xs text-muted">{c.label}</div>
                </div>
              ))}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-muted">
                Tell us what you need and we&apos;ll get back to you with a clear
                scope and honest estimate &mdash; free, before you commit to anything.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
                >
                  Get a free quote
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </Link>
                <a
                  href="tel:+15599001400"
                  className="inline-flex items-center justify-center gap-3 rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-surface-light"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent" aria-hidden="true">
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                  </svg>
                  (559) 900-1400
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
