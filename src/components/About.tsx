"use client";

import { motion } from "framer-motion";

const credentials = [
  { value: "Since 2005", label: "20+ Years in the Field" },
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              Small team. No runaround.
            </h2>

            <div className="mt-8 space-y-5">
              <p className="text-lg leading-relaxed text-muted">
                VTS started in 2005 doing web and server work. Clients
                like{" "}
                <a href="https://bravofarms.com" target="_blank" rel="noopener" className="font-medium text-foreground underline decoration-accent/30 hover:text-accent transition-colors">Bravo Farms</a>{" "}
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
                We know every client we take on is trusting us with something
                that matters to them. That&apos;s not lost on us &mdash; it&apos;s
                why we treat every project like our reputation depends on it.
                Because it does.
              </p>
            </div>
          </motion.div>

          {/* Right — credentials (1/3) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:content-start"
          >
            {credentials.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl border border-border bg-surface-light p-4 text-center lg:p-5"
              >
                <div className="text-lg font-bold text-accent sm:text-xl">{c.value}</div>
                <div className="mt-1 text-xs text-muted">{c.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
