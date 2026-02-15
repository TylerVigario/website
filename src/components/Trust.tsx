"use client";

import { motion } from "framer-motion";

const credentials = [
  { label: "21+ Years Experience", detail: "Writing code since 2005" },
  { label: "CompTIA A+ Certified", detail: "Self-studied, passed as a teen" },
  { label: "Pursuing BICSI", detail: "Commercial & institutional cabling" },
  { label: "Full Stack", detail: "Software through infrastructure" },
];

export default function Trust() {
  return (
    <section className="relative border-y border-white/5 bg-surface py-14">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {credentials.map((c) => (
            <div key={c.label} className="text-center">
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
