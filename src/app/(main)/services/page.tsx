import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/lib/services";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "IT Services",
  description:
    "Full-stack IT services in Fresno, CA — networking, security cameras, cabling, servers, custom software, and IT strategy. Transparent hourly rate, no retainers.",
  alternates: {
    canonical: "https://tylervigario.com/services",
  },
  openGraph: {
    title: "IT Services | Vigario Technology Solutions",
    description:
      "Full-stack IT services in Fresno, CA — networking, security cameras, cabling, servers, custom software, and IT strategy. Transparent hourly rate, no retainers.",
    url: "https://tylervigario.com/services",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://tylervigario.com/services#service",
  name: "IT Services",
  description:
    "Full-stack IT services — networking, security cameras, cabling, servers, custom software, and IT strategy.",
  url: "https://tylervigario.com/services",
  provider: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
  },
  serviceType: services.map((s) => s.title),
  areaServed: [
    { "@type": "City", name: "Fresno" },
    { "@type": "City", name: "Clovis" },
    { "@type": "City", name: "Visalia" },
    { "@type": "GeoShape", name: "Central Valley, CA" },
  ],
};

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <section className="pt-32 pb-16 lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up" margin="0px">
            <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              You know the cost upfront.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Transparent hourly rate, no retainers, no surprises. We&apos;ll
              scope it before we start &mdash; whether it&apos;s a full network
              buildout or just getting your WiFi working again.
            </p>
          </FadeIn>

          {/* Service cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <FadeIn key={s.title} animation="fade-in" delay={i * 0.1}>
                <Link
                  href={`/contact?service=${encodeURIComponent(s.title)}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface-light p-6 transition-all sm:p-8 hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-accent-soft p-3 text-accent">
                    {s.icon}
                  </div>
                  <h2 className="mb-3 text-xl font-semibold text-navy">{s.title}</h2>
                  <p className="leading-relaxed text-muted">{s.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Get a quote
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Approach section */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                We&apos;re not a vendor. We&apos;re builders.
              </h2>
              <p className="mt-4 text-lg text-muted leading-relaxed">
                Most IT shops don&apos;t write software, and most dev shops
                don&apos;t pull cable. We do both. Every project is founder-led
                &mdash; no rotating contractors, no ticket queues, no runaround.
              </p>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
                >
                  Get a free quote
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
