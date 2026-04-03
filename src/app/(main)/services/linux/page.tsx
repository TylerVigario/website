import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Linux Systems",
  description:
    "Linux server deployment, configuration, and maintenance for small businesses. Web servers, Docker, networking appliances, storage — CLI-driven, no bloat.",
  alternates: {
    canonical: "https://tylervigario.com/services/linux",
  },
  openGraph: {
    title: "Linux Systems | Vigario Technology Solutions",
    description:
      "Linux server deployment, configuration, and maintenance for small businesses. Web servers, Docker, networking appliances, storage — CLI-driven, no bloat.",
    url: "https://tylervigario.com/services/linux",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://tylervigario.com/services/linux#service",
  name: "Linux Systems Administration",
  description:
    "Linux server deployment, configuration, and ongoing maintenance.",
  url: "https://tylervigario.com/services/linux",
  provider: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
  },
  serviceType: [
    "Linux Server Administration",
    "Docker Container Management",
    "Web Server Configuration",
    "Linux System Maintenance",
  ],
};

const capabilities = [
  {
    title: "Server Deployment",
    items: [
      "Bare-metal and VM provisioning",
      "Distro selection and installation",
      "SSH hardening and key management",
      "Firewall configuration (iptables, ufw, nftables)",
      "User and permission management",
      "Disk partitioning and storage setup",
    ],
  },
  {
    title: "Services & Containers",
    items: [
      "Docker and Docker Compose deployments",
      "Web server setup (Nginx, Apache, Caddy)",
      "Reverse proxy and SSL/TLS configuration",
      "Database deployment (PostgreSQL, MySQL, SQLite)",
      "DNS, DHCP, and network services",
      "Self-hosted applications and dashboards",
    ],
  },
  {
    title: "Maintenance & Reliability",
    items: [
      "Automated updates and patch management",
      "Log monitoring and rotation",
      "Backup scripting and verification",
      "Performance tuning and resource optimization",
      "Cron jobs and task scheduling",
      "Disaster recovery planning",
    ],
  },
];

export default function LinuxPage() {
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
              Linux Systems
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              Linux Systems
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted leading-relaxed">
              Server-side Linux deployment, configuration, and maintenance.
              Web servers, Docker hosts, networking appliances, storage &mdash;
              all CLI-driven, no unnecessary bloat. Built to run reliably and
              stay out of the way.
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
                  Linux is what runs when nobody&apos;s watching &mdash; your web
                  server, your NVR, your Docker stack. I set these systems up to
                  be stable, secure, and maintainable. No GUI dependencies,
                  no black-box configs. Everything is documented and
                  reproducible.
                </p>
                <p>
                  Whether you need a single web server deployed or a full
                  self-hosted stack with containers, reverse proxies, and
                  automated backups, I&apos;ll build it right the first time
                  and make sure you can manage it going forward.
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
                Need a Linux server set up right?
              </h2>
              <p className="mt-4 text-lg text-muted">
                From a simple web server to a full containerized stack &mdash;
                let&apos;s talk about what you need.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/contact?service=Computers%2C%20Servers%20%26%20Cloud"
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
