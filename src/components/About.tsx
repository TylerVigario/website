import FadeIn from "./FadeIn";

const credentials = [
  { value: "Since 2005", label: "20+ Years in Tech" },
  { value: "Full Stack", label: "Software to Infrastructure" },
  { value: "Founder-Led", label: "Real Accountability" },
  { value: "Central Valley", label: "On-Site & Remote" },
];

export default function About() {
  return (
    <section id="about" className="relative scroll-mt-24 py-16 lg:py-20">
      {/* Subtle divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          {/* Left — story (2/3) */}
          <FadeIn className="lg:col-span-2">
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              We build. We don&apos;t resell.
            </h2>

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
          <FadeIn delay={0.2} className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:content-start">
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
  );
}
