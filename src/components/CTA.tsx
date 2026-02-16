"use client";

import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section id="contact" className="relative pb-8 pt-16 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-linear-to-br from-accent-soft via-surface-light to-surface-light p-8 sm:p-12 lg:p-20"
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />

          <h2 className="relative text-2xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
            Want to chat about<br />
            your project?
          </h2>
          <p className="relative mt-6 max-w-lg text-lg text-muted">
            Give me a call or shoot me an email. I&apos;m happy to talk
            through what you need &mdash; no pressure, no pitch.
          </p>

          <div className="relative mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href="tel:+15599001400"
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-all sm:px-8 sm:py-4 sm:text-lg hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
              (559) 900-1400
            </a>
            <span className="text-sm text-muted">
              or email <a href="mailto:tyler@vigario.tech" className="text-accent hover:underline">tyler@vigario.tech</a>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
