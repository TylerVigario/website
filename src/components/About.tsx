"use client";

import { motion } from "framer-motion";

const credentials = [
  { value: "20+ Years", label: "In Tech" },
  { value: "CompTIA A+", label: "Certified" },
  { value: "BICSI", label: "In Progress" },
  { value: "Full Stack", label: "Software to Infrastructure" },
];

export default function About() {
  return (
    <section id="about" className="relative scroll-mt-20 py-16 lg:py-20">
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
              A bit about me
            </h2>

            <div className="mt-8 space-y-5">
              <p className="text-lg leading-relaxed text-muted">
                I&apos;m Tyler &mdash; self-taught since 2005, CompTIA A+ certified,
                and comfortable working on everything from custom web applications
                to Windows Server deployments to pulling cable through ceilings. I&apos;ve
                spent years as a professional web developer building sites, internal
                tools, and infrastructure for businesses across the Central Valley.
              </p>

              <p className="text-lg leading-relaxed text-muted">
                VTS grew out of clients like{" "}
                <a href="https://bravofarms.com" target="_blank" rel="noopener" className="font-medium text-foreground underline decoration-accent/30 hover:text-accent transition-colors">Bravo Farms</a>{" "}
                wanting to work with me directly. What started as website and
                server work turned into networking, security cameras, and
                full-on structured cabling installs. I invested in the tools and
                training to do it all properly &mdash; because that&apos;s what
                they needed and I don&apos;t do things halfway.
              </p>

              <p className="text-lg leading-relaxed text-muted">
                No call centers, no runaround. Just me. I&apos;m currently
                pursuing BICSI certification to round out my infrastructure
                credentials &mdash; always learning, always improving.
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
