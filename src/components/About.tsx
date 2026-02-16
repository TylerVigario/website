"use client";

import { motion } from "framer-motion";
const stats = [
  { value: "21+", label: "Years in Technology" },
  { value: "Full Stack", label: "Software to Infrastructure" },
  { value: "BICSI", label: "Certification In Progress" },
];

const timeline = [
  { year: "2005", label: "First lines of code at 14 — self-taught from day one" },
  { year: "2006", label: "Passed CompTIA A+ exam as a teenager, book study only" },
  { year: "2008", label: "C# application development & desktop automation" },
  { year: "2011", label: "Full-stack web — PHP, databases, server management" },
  { year: "2015", label: "Modern JS/TS, enterprise web platforms & APIs" },
  { year: "2020", label: "Network engineering, structured cabling & infrastructure" },
  { year: "Now", label: "Vigario Technology Solutions — pursuing BICSI certification" },
];

export default function About() {
  return (
    <section id="about" className="relative py-16 lg:py-20">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/images/retro-tech.jpg"
          alt=""
          className="h-full w-full object-cover opacity-[0.07] grayscale"
        />
        <div className="absolute inset-0 bg-linear-to-b from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-linear-to-r from-background via-transparent to-background" />
      </div>

      {/* Subtle divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Left — story */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="bg-linear-to-r from-foreground to-muted bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">
              Two decades across
              <br />
              <span className="bg-linear-to-r from-accent-bright to-accent bg-clip-text text-transparent">every layer of the stack.</span>
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-muted">
              Most firms hand you off to a junior tech reading from a
              runbook. When you work with Vigario, you get the owner &mdash;
              someone with 21 years of hands-on experience across software
              development, network engineering, and IT infrastructure.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-muted">
              I passed CompTIA A+ as a teenager from self-study alone.
              I&apos;ve built everything from desktop automation tools to
              enterprise web platforms. Now I&apos;m bringing that same
              depth to commercial infrastructure &mdash; currently pursuing
              BICSI certification for structured cabling in institutional
              and commercial environments.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 sm:flex sm:gap-10">
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-2xl font-bold text-accent-bright sm:text-3xl">{s.value}</div>
                  <div className="mt-1 text-xs text-muted sm:text-sm">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — timeline */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute left-4 top-2 bottom-2 w-px bg-linear-to-b from-accent/40 via-accent/20 to-transparent" />

            <div className="space-y-8">
              {timeline.map((t, i) => (
                <motion.div
                  key={t.year}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative pl-12"
                >
                  <div className="absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 border-accent bg-background" />
                  <div className="font-mono text-sm text-accent-bright">{t.year}</div>
                  <div className="mt-1 text-muted">{t.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
