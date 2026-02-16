"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative flex items-center overflow-hidden pt-20 pb-16 sm:pb-20 lg:pb-28 lg:pt-32">
      {/* Faded logo watermark */}
      <div className="pointer-events-none absolute right-[-5%] top-1/2 -translate-y-1/2 w-125 h-125 sm:w-150 sm:h-150 lg:w-175 lg:h-175 opacity-[0.04]">
        <img
          src="/images/VTS Logo Symbol.png"
          alt=""
          className="h-full w-full object-contain"
        />
      </div>

      {/* Soft decorative gradient */}
      <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-accent/[0.06] blur-[100px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-4 py-1.5 text-sm text-accent">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            Accepting new projects
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight text-navy sm:text-5xl md:text-6xl">
            Good tech help shouldn&apos;t be
            this hard to find.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
            I&apos;m Tyler &mdash; I&apos;ve been building networks, fixing
            computers, and wiring up businesses for 21 years. No call centers,
            no ticket queues. Just one experienced person who picks up the phone.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
            <a
              href="tel:+15599001400"
              className="group flex items-center justify-center gap-3 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-all sm:px-8 sm:py-4 sm:text-lg hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
              (559) 900-1400
            </a>
            <a
              href="#services"
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-base font-medium text-foreground transition-colors sm:px-8 sm:py-4 sm:text-lg hover:border-accent/30 hover:bg-surface"
            >
              See how I can help
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
