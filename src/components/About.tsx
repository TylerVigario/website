"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animate(count, target, { duration: 1.5, ease: "easeOut" });
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [count, target, hasAnimated]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

const credentials = [
  { value: <CountUp target={21} suffix="+" />, label: "Years Experience" },
  { value: "CompTIA A+", label: "Certified" },
  { value: "BICSI", label: "In Progress" },
  { value: "Full Stack", label: "Software to Infrastructure" },
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
          className="h-full w-full object-cover opacity-[0.04] grayscale"
        />
        <div className="absolute inset-0 bg-linear-to-b from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-linear-to-r from-background via-transparent to-background" />
      </div>

      {/* Subtle divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Left — story */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
              A bit about me
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-muted">
              I wrote my first line of code at 14 and never really stopped. Over
              21 years I&apos;ve worked my way through every layer of technology
              &mdash; from writing desktop apps in C# to building web platforms
              to pulling cable through ceilings.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-muted">
              I started Vigario because I got tired of watching people get the
              runaround from big IT companies. When you call me, you get me. I
              already know your setup because I&apos;m the one who built it.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-muted">
              Right now I&apos;m pursuing BICSI certification to round out my
              infrastructure skills. I like learning new things &mdash;
              it&apos;s kind of the whole reason I got into this.
            </p>

            {/* Credentials */}
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  <div className="font-mono text-sm text-accent">{t.year}</div>
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
