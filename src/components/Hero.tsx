"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative flex min-h-dvh items-center overflow-hidden pt-24 pb-12 sm:min-h-0 sm:pb-16 lg:pb-20 lg:pt-32 snap-start">
      {/* Soft decorative gradient */}
      <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl lg:flex-1"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-4 py-1.5 text-sm text-accent">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Accepting new projects
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight text-navy sm:text-5xl md:text-6xl">
              IT that writes code.<br className="hidden sm:block" /> Imagine that.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
              From pulling cable to building custom software, we handle the full
              stack &mdash; and we actually pick up the phone. Based in the
              Central Valley, serving clients since 2005.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <a
                href="#contact"
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-5 py-3 text-base font-semibold text-white transition-all sm:px-8 sm:py-4 sm:text-lg hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
              >
                Get a free quote
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="tel:+15599001400"
                className="flex items-center justify-center gap-3 whitespace-nowrap rounded-xl border border-border px-5 py-3 text-base font-medium text-foreground transition-colors sm:px-8 sm:py-4 sm:text-lg hover:border-accent/30 hover:bg-surface"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent" aria-hidden="true">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                </svg>
                (559) 900-1400
              </a>
            </div>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="relative hidden w-full max-w-sm sm:block lg:max-w-md lg:shrink-0"
          >
            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-navy/10 max-h-112 lg:max-h-128">
              <Image
                src="/images/hero.webp"
                alt="Server rack with ethernet cables and network infrastructure"
                width={640}
                height={960}
                className="h-full w-full object-cover saturate-[0.6] brightness-95"
                priority
              />
              {/* Blue brand tint overlay */}
              <div className="pointer-events-none absolute inset-0 bg-accent/15 mix-blend-multiply" />
            </div>
            {/* Subtle glow behind image */}
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-accent/8 blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
