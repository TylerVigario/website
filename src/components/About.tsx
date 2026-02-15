"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "21+", label: "Years of Experience" },
  { value: "7", label: "Languages & Stacks" },
  { value: "100%", label: "Problems Solved" },
];

const timeline = [
  { year: "2005", label: "Started coding with AutoIt at 14" },
  { year: "2008", label: "Moved to C# and built desktop applications" },
  { year: "2011", label: "PHP & full-stack web development" },
  { year: "2015", label: "Deep dive into modern JavaScript & TypeScript" },
  { year: "2020", label: "Network engineering & infrastructure" },
  { year: "Now", label: "Vigario Technology Solutions — solving everything" },
];

export default function About() {
  return (
    <section id="about" className="relative py-32">
      {/* Subtle divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-start">
          {/* Left — story */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              21 years writing code.
              <br />
              <span className="text-accent-bright">Zero unsolved problems.</span>
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-muted">
              I started programming at 14 — not because someone told me to,
              but because I wanted to build things that didn't exist yet.
              Two decades later, that hasn't changed.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-muted">
              From low-level automation scripts to enterprise web platforms,
              from network architecture to cloud infrastructure — I've touched
              every layer of the stack. When you call Vigario, you get someone
              who's actually done the work, not someone reading from a playbook.
            </p>

            {/* Stats */}
            <div className="mt-10 flex gap-10">
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-3xl font-bold text-accent-bright">{s.value}</div>
                  <div className="mt-1 text-sm text-muted">{s.label}</div>
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
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-accent/40 via-accent/20 to-transparent" />

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
