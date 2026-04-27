import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "IT Services in Fresno, CA",
  description:
    "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
  alternates: {
    canonical: "https://tylervigario.com",
  },
  openGraph: {
    title: "Vigario Technology Solutions | IT Services in Fresno, CA",
    description:
      "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
    url: "https://tylervigario.com",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigario Technology Solutions | IT Services in Fresno, CA",
    description:
      "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://tylervigario.com/#business",
  name: "Vigario Technology Solutions",
  description:
    "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
  url: "https://tylervigario.com",
  telephone: "+1-559-900-1400",
  email: "tyler@tylervigario.com",
  image: "https://tylervigario.com/images/vts-logo.png",
  founder: {
    "@type": "Person",
    name: "Tyler Vigario",
  },
  foundingDate: "2021",
  address: {
    "@type": "PostalAddress",
    streetAddress: "3304 W Tiger Ave",
    addressLocality: "Riverdale",
    addressRegion: "CA",
    postalCode: "93656",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 36.43,
    longitude: -119.86,
  },
  areaServed: [
    { "@type": "City", name: "Fresno" },
    { "@type": "City", name: "Clovis" },
    { "@type": "City", name: "Madera" },
    { "@type": "City", name: "Visalia" },
    { "@type": "City", name: "Riverdale" },
    { "@type": "GeoShape", name: "Central Valley, CA" },
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "07:00",
    closes: "22:00",
  },
  serviceType: [
    "Networking & WiFi",
    "Security & Cameras",
    "Low-Voltage Cabling",
    "Computer & Server Support",
    "Custom Software Development",
    "IT Strategy & Consulting",
  ],
  sameAs: ["https://github.com/tylervigario", "https://g.co/kgs/wyVQ2pD"],
  slogan: "IT that writes code.",
  knowsAbout: [
    "Network Infrastructure",
    "Wireless Networking",
    "Video Surveillance Systems",
    "Structured Cabling",
    "Server Administration",
    "Cloud Infrastructure",
    "Custom Web Applications",
    "IT Consulting",
  ],
  priceRange: "$$",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero />

      {/* Services preview */}
      <Services />
      <div className="bg-surface pb-12 lg:pb-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-bright"
          >
            View all services
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* About preview */}
      <About preview />
      <div className="pb-12 lg:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-bright"
          >
            More about us
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* CTA banner — no form, links to /contact */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-muted">
                Tell us what you need and we&apos;ll get back to you with a clear scope and honest
                estimate &mdash; free, before you commit to anything.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
                >
                  Get a free quote
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
                <a
                  href="tel:+15599001400"
                  className="flex items-center justify-center gap-3 rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-surface-light"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 text-accent"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  (559) 900-1400
                </a>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Transparent hourly rate
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Scope before we start
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  No retainers
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
