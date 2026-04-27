import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Network Engineering",
  description:
    "Network design, deployment, and support for small businesses in Fresno and the Central Valley. WiFi, switching, routing, firewalls, VPNs, and diagnostics.",
  alternates: {
    canonical: "https://tylervigario.com/services/networking",
  },
  openGraph: {
    title: "Network Engineering | Vigario Technology Solutions",
    description:
      "Network design, deployment, and support for small businesses in Fresno and the Central Valley. WiFi, switching, routing, firewalls, VPNs, and diagnostics.",
    url: "https://tylervigario.com/services/networking",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://tylervigario.com/services/networking#service",
  name: "Network Engineering & Support",
  description:
    "Network design, deployment, troubleshooting, and ongoing support for small businesses.",
  url: "https://tylervigario.com/services/networking",
  provider: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
  },
  serviceType: [
    "Network Design",
    "WiFi Deployment",
    "Firewall Configuration",
    "Network Troubleshooting",
  ],
};

const capabilities = [
  {
    title: "Design & Deployment",
    items: [
      "Network architecture and topology design",
      "Commercial and residential WiFi planning",
      "Managed switch configuration and VLANs",
      "Router and gateway setup",
      "Firewall rules and security policies",
      "VPN configuration (site-to-site, remote access)",
    ],
  },
  {
    title: "Infrastructure",
    items: [
      "Structured cabling and cable runs",
      "Patch panel termination and testing",
      "Rack builds and cable management",
      "PoE deployment for cameras and APs",
      "Fiber optic connections",
      "Network closet and IDF organization",
    ],
  },
  {
    title: "Support & Diagnostics",
    items: [
      "Connectivity troubleshooting",
      "Bandwidth and latency analysis",
      "Network monitoring setup",
      "Firmware updates and configuration backups",
      "ISP coordination and handoff",
      "Expansion planning and capacity upgrades",
    ],
  },
];

export default function NetworkingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="pt-32 pb-16 lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up" margin="0px">
            <p className="text-sm font-medium text-accent">
              <Link href="/services" className="hover:text-accent-bright transition-colors">
                Services
              </Link>
              {" / "}
              Network Engineering
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              Network Engineering
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted leading-relaxed">
              From home routers to commercial wireless deployments &mdash; I design, build, and
              troubleshoot networks that actually work. Switching, routing, firewalls, VPNs, WiFi,
              cabling, and everything in between.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Capabilities */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cat, i) => (
              <FadeIn key={cat.title} animation="fade-in" delay={i * 0.1}>
                <div className="h-full rounded-xl border border-border bg-surface-light p-6">
                  <h2 className="text-lg font-semibold text-navy">{cat.title}</h2>
                  <ul className="mt-4 space-y-2.5">
                    {cat.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                How it works
              </h2>
              <div className="mt-6 space-y-4 text-muted leading-relaxed sm:text-lg">
                <p>
                  Networking is the foundation everything else sits on. A bad network makes every
                  other system unreliable &mdash; cameras drop, VoIP calls cut out, cloud apps
                  crawl. I start with understanding the layout, the traffic patterns, and the pain
                  points, then build a network that handles what you actually need it to handle.
                </p>
                <p>
                  Every install is clean, labeled, and documented. I don&apos;t leave a rats nest of
                  cables behind a desk and call it done. Whether it&apos;s a single access point or
                  a multi-building deployment with VLANs and managed switching, the standard is the
                  same.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Network problems?
              </h2>
              <p className="mt-4 text-lg text-muted">
                Slow WiFi, dead zones, unreliable connections, or a full buildout from scratch
                &mdash; let&apos;s figure it out.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/contact?service=Networking%20%26%20WiFi"
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
                <a
                  href="tel:+15599001400"
                  className="inline-flex items-center justify-center gap-3 rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-surface-light"
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
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
