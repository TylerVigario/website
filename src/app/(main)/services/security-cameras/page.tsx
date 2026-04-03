import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Security Cameras",
  description:
    "Security camera installation with local AI detection via Frigate NVR. No cloud subscriptions, no monthly fees. Reliable, private, and affordable for small businesses.",
  alternates: {
    canonical: "https://tylervigario.com/services/security-cameras",
  },
  openGraph: {
    title: "Security Cameras | Vigario Technology Solutions",
    description:
      "Security camera installation with local AI detection via Frigate NVR. No cloud subscriptions, no monthly fees. Reliable, private, and affordable for small businesses.",
    url: "https://tylervigario.com/services/security-cameras",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://tylervigario.com/services/security-cameras#service",
  name: "Security Camera Installation",
  description:
    "Security camera systems with local AI-powered detection via Frigate NVR. No cloud subscriptions required.",
  url: "https://tylervigario.com/services/security-cameras",
  provider: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
  },
  serviceType: [
    "Security Camera Installation",
    "NVR Configuration",
    "Video Surveillance",
    "AI Object Detection",
  ],
};

const advantages = [
  {
    title: "Local AI Detection",
    desc: "Frigate runs on your hardware, not in the cloud. Person, vehicle, and animal detection happens locally — fast, private, and with no recurring fees.",
  },
  {
    title: "No Subscriptions",
    desc: "Most camera vendors lock useful features behind monthly plans. With a local NVR setup, you own the system outright. No cloud dependency, no surprise charges.",
  },
  {
    title: "Reliable Recording",
    desc: "Footage is stored on your own hardware — not at the mercy of an internet outage or a cloud provider's uptime. If the internet goes down, your cameras keep recording.",
  },
  {
    title: "Remote Access",
    desc: "Check your cameras from anywhere. I configure secure remote access so you can view live feeds and playback from your phone or desktop without exposing your network.",
  },
];

const capabilities = [
  {
    title: "Installation",
    items: [
      "Camera placement and mounting",
      "PoE cable runs and termination",
      "Weatherproof and indoor installations",
      "PoE switch and network integration",
      "NVR hardware setup and configuration",
      "Existing system evaluation and upgrades",
    ],
  },
  {
    title: "Software & AI",
    items: [
      "Frigate NVR deployment and configuration",
      "AI object detection zones and rules",
      "Person, vehicle, and animal classification",
      "Smart notifications (only alert on what matters)",
      "Home Assistant integration",
      "Timeline and event review setup",
    ],
  },
  {
    title: "Ongoing Support",
    items: [
      "Firmware updates and maintenance",
      "Storage management and retention policies",
      "Camera additions and relocations",
      "Detection zone tuning",
      "Backup and recovery configuration",
      "System health monitoring",
    ],
  },
];

export default function SecurityCamerasPage() {
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
              <Link href="/services" className="hover:text-accent-bright transition-colors">Services</Link>
              {" / "}
              Security Cameras
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              Security Cameras
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted leading-relaxed">
              Camera systems with local AI detection powered by Frigate NVR.
              No cloud subscriptions, no monthly fees, no vendor lock-in.
              Just reliable surveillance that you own and control &mdash;
              affordable enough for any small business.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Advantages grid */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
              Why local AI?
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {advantages.map((adv, i) => (
              <FadeIn key={adv.title} animation="fade-in" delay={i * 0.1}>
                <div className="h-full rounded-xl border border-border bg-surface-light p-6">
                  <h3 className="text-lg font-semibold text-navy">{adv.title}</h3>
                  <p className="mt-3 text-muted leading-relaxed">{adv.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
              What&apos;s included
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((cat, i) => (
              <FadeIn key={cat.title} animation="fade-in" delay={i * 0.1}>
                <div className="h-full rounded-xl border border-border bg-surface-light p-6">
                  <h3 className="text-lg font-semibold text-navy">{cat.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {cat.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
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

      {/* Comparison */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Cloud vs. Local
              </h2>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 pr-6 font-medium text-muted" />
                      <th className="pb-3 pr-6 font-semibold text-navy">Local (Frigate)</th>
                      <th className="pb-3 font-semibold text-muted">Typical Cloud</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted">
                    {[
                      ["Monthly cost", "None", "$10\u2013$30/mo per camera"],
                      ["AI detection", "Included", "Paid tier"],
                      ["Recording if internet is down", "Yes", "No"],
                      ["Data privacy", "Stays on your network", "Uploaded to cloud"],
                      ["Vendor lock-in", "None", "High"],
                      ["Smart notifications", "Fully customizable", "Limited"],
                    ].map(([feature, local, cloud]) => (
                      <tr key={feature} className="border-b border-border/50">
                        <td className="py-3 pr-6 font-medium text-foreground">{feature}</td>
                        <td className="py-3 pr-6 text-accent font-medium">{local}</td>
                        <td className="py-3">{cloud}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn animation="fade-in-up">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Ready to ditch the cloud fees?
              </h2>
              <p className="mt-4 text-lg text-muted">
                I&apos;ll scope the install, recommend cameras that fit your
                space and budget, and have you up and running with local AI
                detection &mdash; no subscriptions, no surprises.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/contact?service=Security%20%26%20Cameras"
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
