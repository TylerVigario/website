import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/lib/services";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "IT Services",
  description:
    "Full-stack IT services in Fresno, CA — networking, security cameras, Windows & Linux systems, cabling, custom software, and IT strategy. Transparent hourly rate, no retainers.",
  alternates: {
    canonical: "https://tylervigario.com/services",
  },
  openGraph: {
    title: "IT Services | Vigario Technology Solutions",
    description:
      "Full-stack IT services in Fresno, CA — networking, security cameras, Windows & Linux systems, cabling, custom software, and IT strategy. Transparent hourly rate, no retainers.",
    url: "https://tylervigario.com/services",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IT Services | Vigario Technology Solutions",
    description:
      "Full-stack IT services in Fresno, CA — networking, security cameras, Windows & Linux systems, cabling, custom software, and IT strategy. Transparent hourly rate, no retainers.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://tylervigario.com/services#service",
  name: "IT Services",
  description:
    "Full-stack IT services — networking, security cameras, Windows & Linux systems, cabling, custom software, and IT strategy.",
  url: "https://tylervigario.com/services",
  provider: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
  },
  serviceType: [
    ...services.map((s) => s.title),
    "Windows Systems Management",
    "Linux Server Administration",
  ],
  areaServed: [
    { "@type": "City", name: "Fresno" },
    { "@type": "City", name: "Clovis" },
    { "@type": "City", name: "Visalia" },
    { "@type": "GeoShape", name: "Central Valley, CA" },
  ],
};

/* Featured service pages — these have dedicated pages */
const featured = [
  {
    title: "Network Engineering",
    desc: "Design, deployment, and troubleshooting. WiFi, switching, routing, firewalls, VPNs, cabling — the full stack.",
    href: "/services/networking",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
        />
      </svg>
    ),
  },
  {
    title: "Security Cameras",
    desc: "Local AI detection with Frigate NVR. No cloud subscriptions, no monthly fees. Reliable, private, and affordable.",
    href: "/services/security-cameras",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    title: "Windows Systems",
    desc: "Deployment, management, and app support for desktops and servers. Active Directory, Group Policy, patching — if it runs on Windows, I handle it.",
    href: "/services/windows",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
        />
      </svg>
    ),
  },
  {
    title: "Linux Systems",
    desc: "Server deployment, configuration, and maintenance. Web servers, Docker, networking appliances, storage — CLI-driven, no bloat.",
    href: "/services/linux",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },
];

/* General services — no dedicated page yet */
const general = services.filter(
  (s) =>
    !["Networking & WiFi", "Security & Cameras", "Computers, Servers & Cloud"].includes(s.title),
);

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
              Transparent hourly rate, no retainers, no surprises. We&apos;ll scope it before we
              start &mdash; whether it&apos;s a full network buildout or just getting your WiFi
              working again.
            </p>
          </FadeIn>

          {/* Featured services — have dedicated pages */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {featured.map((s, i) => (
              <FadeIn key={s.title} animation="fade-in" delay={i * 0.1}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface-light p-6 transition-all sm:p-8 hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-accent-soft p-3 text-accent">
                    {s.icon}
                  </div>
                  <h2 className="mb-3 text-xl font-semibold text-navy">{s.title}</h2>
                  <p className="leading-relaxed text-muted">{s.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Learn more
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
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* General services — link to contact */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
              Also available
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {general.map((s, i) => (
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
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                We&apos;re not a vendor. We&apos;re builders.
              </h2>
              <p className="mt-4 text-lg text-muted leading-relaxed">
                Most IT shops don&apos;t write software, and most dev shops don&apos;t pull cable.
                We do both. Every project is founder-led &mdash; no rotating contractors, no ticket
                queues, no runaround.
              </p>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
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
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
