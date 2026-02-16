"use client";

import { motion } from "framer-motion";

const credentials = [
  { value: "Since 2005", label: "In Tech" },
  { value: "CompTIA A+", label: "Certified" },
  { value: "BICSI", label: "In Progress" },
  { value: "Full Stack", label: "Software to Infrastructure" },
];

export default function About() {
  return (
    <section id="about" className="relative py-16 lg:py-20">
      {/* Subtle divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
            A bit about me
          </h2>

          <div className="mt-8 max-w-3xl space-y-5">
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

          {/* Credentials */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl">
            {credentials.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl border border-border bg-surface-light p-4 text-center"
              >
                <div className="text-lg font-bold text-accent sm:text-xl">{c.value}</div>
                <div className="mt-1 text-xs text-muted">{c.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
