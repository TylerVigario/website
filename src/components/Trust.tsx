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
  { label: <><CountUp target={21} suffix="+" /> Years Experience</>, detail: "Writing code since 2005" },
  { label: "CompTIA A+ Certified", detail: "Self-studied, passed as a teen" },
  { label: "Pursuing BICSI", detail: "Commercial & institutional cabling" },
  { label: "Full Stack", detail: "Software through infrastructure" },
];

export default function Trust() {
  return (
    <section className="relative border-y border-white/5 bg-surface py-10 lg:py-14">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-x-6 gap-y-6 sm:gap-8 lg:grid-cols-4"
        >
          {credentials.map((c, i) => (
            <div key={i} className="text-center">
              <div className="text-sm font-semibold uppercase tracking-wider text-accent-bright">
                {c.label}
              </div>
              <div className="mt-1 text-sm text-muted">{c.detail}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
