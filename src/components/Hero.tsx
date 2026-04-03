import Link from "next/link";
import FadeIn from "./FadeIn";

const stats = [
  { value: "20+", label: "Years in Tech" },
  { value: "Full Stack", label: "Cable to Code" },
  { value: "Local", label: "Central Valley" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-navy" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Gradient accents */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-150 w-150 rounded-full bg-accent/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-125 w-125 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-20 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32">
        <FadeIn animation="fade-in-up" margin="0px">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Your IT shop that{" "}
              <span className="text-accent-bright">actually picks up</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg sm:mt-8">
              From pulling cable to writing custom software, I handle the
              full stack for small businesses in the Central Valley.
              No ticket queues, no runaround &mdash; just 20+ years of
              hands-on experience and a direct line.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/contact"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition-all sm:w-auto sm:px-8 sm:py-4 sm:text-lg hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/25"
              >
                Get a free quote
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
              <a
                href="tel:+15599001400"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 px-6 py-3.5 text-base font-medium text-white transition-colors sm:w-auto sm:px-8 sm:py-4 sm:text-lg hover:border-white/40 hover:bg-white/5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-accent-bright" aria-hidden="true">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                </svg>
                (559) 900-1400
              </a>
            </div>
          </div>
        </FadeIn>

        {/* Stats bar */}
        <FadeIn animation="fade-in" delay={0.2} margin="0px">
          <div className="mx-auto mt-16 flex max-w-2xl flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:mt-20">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-x-12">
                {i > 0 && (
                  <div className="hidden h-8 w-px bg-white/15 sm:block" />
                )}
                <div className="text-center">
                  <div className="text-xl font-bold text-accent-bright sm:text-2xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs text-white/50 sm:text-sm">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
