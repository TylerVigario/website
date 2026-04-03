import Image from "next/image";
import Link from "next/link";
import FadeIn from "./FadeIn";

export default function Hero() {
  return (
    <section className="relative flex min-h-dvh items-center overflow-hidden pt-24 pb-12 sm:min-h-0 sm:pb-16 lg:pb-20 lg:pt-32 snap-start">
      {/* Soft decorative gradient */}
      <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
          {/* Text content */}
          <FadeIn animation="fade-in-up" className="max-w-2xl lg:flex-1" margin="0px">
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
              Central Valley, backed by 20+ years of hands-on experience.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-5 py-3 text-base font-semibold text-white transition-all sm:px-8 sm:py-4 sm:text-lg hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15"
              >
                Get a free quote
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
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
          </FadeIn>

          {/* Hero image */}
          <FadeIn animation="fade-in-scale" className="relative hidden w-full max-w-sm sm:block lg:max-w-md lg:shrink-0" delay={0.2} margin="0px">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-navy/10 max-h-112 lg:max-h-128">
              <Image
                src="/images/hero.webp"
                alt="Server rack with ethernet cables and network infrastructure"
                width={640}
                height={960}
                className="h-full w-full object-cover saturate-[0.6] brightness-95"
                sizes="(max-width: 639px) 0px, (max-width: 1023px) 384px, 448px"
                loading="eager"
              />
              {/* Blue brand tint overlay */}
              <div className="pointer-events-none absolute inset-0 bg-accent/15 mix-blend-multiply" />
            </div>
            {/* Subtle glow behind image */}
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-accent/8 blur-2xl" />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
