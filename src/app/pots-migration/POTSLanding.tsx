"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import { ApiError } from "@/lib/api/response";

/* ------------------------------------------------------------------ */
/*  Checklist items                                                   */
/* ------------------------------------------------------------------ */
const checklistItems = [
  "Your monthly phone bill is over $200 for basic service",
  "You're paying for lines nobody uses",
  'You received a letter about "copper retirement" or "network modernization"',
  "Your rates have increased without explanation",
  "You received a new contract or BSA you don't remember agreeing to",
  "You've been told there's an early termination fee to leave",
  'Your carrier offered an "alternative plan" that\'s still more expensive than VoIP',
  "You've been with the same carrier for 10+ years and never audited your bill",
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "Will I lose my phone number?",
    a: "No. Number porting is a legal right protected by FCC regulations. Your carrier cannot refuse to release your number, even if there's a billing dispute.",
  },
  {
    q: "How long does the switch take?",
    a: "Typically 1\u20134 weeks from start to finish, depending on how quickly your current carrier processes the port. I handle the coordination.",
  },
  {
    q: "What if my carrier tries to charge me an early termination fee?",
    a: "If you didn't agree to a contract, you likely don't owe it. I'll review your situation, and if they're in the wrong, I'll help you file complaints with the FCC and California PUC to get the fees waived.",
  },
  {
    q: "Is VoIP reliable enough for a business?",
    a: "Yes. VoIP has been the standard for business communications for years. With a decent internet connection, call quality meets or exceeds traditional landlines. I spec the hardware and configure the system to ensure reliability.",
  },
  {
    q: "How much will I save?",
    a: "It varies, but most businesses on legacy POTS are paying $200\u2013$1,500/month. VoIP typically costs $20\u2013$50/month for equivalent service. I've seen annual savings of $5,000\u2013$15,000+.",
  },
  {
    q: "Do I need to buy new phones?",
    a: "You'll need VoIP-compatible handsets. I recommend Yealink \u2014 professional grade, reliable, and affordable. I handle procurement and configuration.",
  },
  {
    q: "What areas do you serve?",
    a: "I'm based in the Central Valley but this work doesn't require me to be on-site. I can help businesses anywhere in California, and most of the advocacy work (audits, carrier disputes, FCC complaints) can be done remotely nationwide.",
  },
];

/* ------------------------------------------------------------------ */
/*  Bill range options                                                */
/* ------------------------------------------------------------------ */
const billRanges = [
  "Under $100",
  "$100\u2013$300",
  "$300\u2013$500",
  "$500\u2013$1,000",
  "Over $1,000",
  "Not sure",
];

/* ------------------------------------------------------------------ */
/*  SVG icons                                                         */
/* ------------------------------------------------------------------ */
function PhoneIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EmailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion item                                                */
/* ------------------------------------------------------------------ */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium text-foreground sm:text-lg"
        aria-expanded={open}
      >
        {q}
        <ChevronIcon open={open} />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-muted leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main landing page component                                       */
/* ------------------------------------------------------------------ */
export default function POTSLanding() {
  /* --- Checklist state --- */
  const [checked, setChecked] = useState<boolean[]>(() =>
    Array.from({ length: checklistItems.length }, () => false),
  );
  const checkedCount = checked.filter(Boolean).length;

  /* --- Form state --- */
  const [form, setForm] = useState({
    business: "",
    name: "",
    contact: "",
    bill: "",
    details: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status !== "sent") return;
    const timer = setTimeout(() => setStatus("idle"), 10000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setStatus("sending");
      setErrorMsg("");

      try {
        const res = await fetch("/api/pots-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const data = ApiError.safeParse(await res.json());
          throw new Error(data.success ? data.data.error : "Something went wrong.");
        }

        setStatus("sent");
        setForm({ business: "", name: "", contact: "", bill: "", details: "" });
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      }
    },
    [form],
  );

  /* --- Scroll to form --- */
  const formRef = useRef<HTMLElement>(null);
  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      {/* ============================================================ */}
      {/*  Minimal nav bar                                              */}
      {/* ============================================================ */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" aria-label="Vigario Technology Solutions home">
            <Image
              src="/images/vts-logo.png"
              alt="Vigario Technology Solutions"
              width={330}
              height={124}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <a
            href="tel:+15599001400"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-bright"
          >
            <PhoneIcon className="h-4 w-4" />
            <span className="hidden sm:inline">(559) 900-1400</span>
            <span className="sm:hidden">Call</span>
          </a>
        </div>
      </header>

      <main id="main" className="pt-16">
        {/* ============================================================ */}
        {/*  Hero                                                        */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />

          <div className="relative mx-auto max-w-6xl px-6">
            <FadeIn animation="fade-in-up">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-5xl lg:text-6xl">
                  Your phone carrier is betting you won&apos;t fight back.
                </h1>
                <p className="mt-6 text-lg text-muted sm:text-xl">
                  I help small businesses escape overpriced legacy phone contracts, fight
                  unauthorized fees, and migrate to modern VoIP &mdash; saving thousands per year.
                </p>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <button
                    onClick={scrollToForm}
                    className="w-full rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15 sm:w-auto"
                  >
                    Find Out If You&apos;re Overpaying
                  </button>
                  <a
                    href="#case-study"
                    className="w-full rounded-xl border border-border px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-surface sm:w-auto text-center"
                  >
                    See the Case Study
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  The Problem                                                 */}
        {/* ============================================================ */}
        <section className="bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn animation="fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Here&apos;s what&apos;s happening to small businesses right now
              </h2>
            </FadeIn>

            <FadeIn animation="fade-in" delay={0.1}>
              <div className="mt-8 space-y-5 text-muted leading-relaxed sm:text-lg">
                <p>
                  Major carriers &mdash; AT&amp;T, Verizon, Lumen, Frontier &mdash; are actively
                  retiring their copper POTS networks. AT&amp;T plans to shut down nearly all copper
                  infrastructure by 2029, and the FCC has relaxed regulations to let them do it
                  faster.
                </p>
                <p>
                  But before they pull the plug, they&apos;re squeezing every dollar they can out of
                  the businesses still connected. Lines that cost $30&ndash;$60/month a few years
                  ago now bill at $150&ndash;$400/month. Some per-line prices have climbed past
                  $1,000. Industry insiders have called these rate hikes{" "}
                  <span className="font-medium text-foreground">
                    &ldquo;borderline extortion.&rdquo;
                  </span>
                </p>
                <p>
                  When businesses try to leave, carriers hit them with surprise contracts and early
                  termination fees &mdash; sometimes generated without the customer&apos;s knowledge
                  or consent. They&apos;re counting on small businesses not knowing their rights or
                  not having the energy to fight back.
                </p>
                <p className="font-medium text-foreground">
                  This isn&apos;t a theory. It happened to one of my clients.
                </p>
              </div>
            </FadeIn>

            {/* Stats bar */}
            <FadeIn animation="fade-in-scale" delay={0.2}>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { value: "1,200%", label: "documented rate hikes on POTS lines" },
                  { value: "$1,000+", label: "per-line monthly costs reported" },
                  { value: "2029", label: "AT&T's copper retirement target" },
                  { value: "90,000+", label: "customers approved for service discontinuation" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border bg-surface-light p-5 text-center"
                  >
                    <div className="text-2xl font-bold text-accent sm:text-3xl">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Case Study: Bravo Farms                                     */}
        {/* ============================================================ */}
        <section id="case-study" className="scroll-mt-24 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn animation="fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                How a 47-year AT&amp;T customer fought back &mdash; and won
              </h2>
            </FadeIn>

            <div className="mt-8 grid gap-10 lg:grid-cols-5 lg:gap-16">
              {/* Narrative */}
              <FadeIn animation="fade-in" delay={0.1} className="lg:col-span-3">
                <div className="space-y-5 text-muted leading-relaxed sm:text-lg">
                  <p>
                    Bravo Farms &mdash; a family business in Traver, CA operating since 1979 &mdash;
                    had been a loyal AT&amp;T customer for 47 years. They were paying roughly{" "}
                    <span className="font-medium text-foreground">$945/month</span> for POTS lines,
                    including lines that weren&apos;t even in use.
                  </p>
                  <p>
                    After an audit, we recommended migrating to VoIP. On February 24, 2026, they
                    canceled two unused lines. AT&amp;T&apos;s rep confirmed the cancellation via
                    email &mdash; no mention of any contract or new terms.
                  </p>
                  <p>
                    On March 1, a port request was submitted to move the remaining lines to VoIP.
                    Two days later, AT&amp;T sent an automated email claiming a new Business Service
                    Agreement had been created &mdash; a one-year contract with a{" "}
                    <span className="font-medium text-foreground">
                      ~$5,000 early termination fee
                    </span>
                    . Bravo Farms never signed, agreed to, or consented to any contract.
                  </p>
                  <p>
                    We built the case, assembled the timeline, identified the violations, and filed
                    an FCC complaint. Within{" "}
                    <span className="font-medium text-foreground">15 days</span>, AT&amp;T&apos;s
                    Office of the President responded. The account was fully disconnected, no early
                    termination fee was charged, and prorated credits were refunded. AT&amp;T
                    acknowledged that{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;renewals must be accepted by the account holder&rdquo;
                    </span>{" "}
                    &mdash; confirming the unauthorized contract was invalid.
                  </p>
                </div>
              </FadeIn>

              {/* Before / After */}
              <FadeIn animation="fade-in-scale" delay={0.2} className="lg:col-span-2">
                <div className="rounded-2xl border border-border bg-surface-light p-6 sm:p-8">
                  <h3 className="text-lg font-semibold text-navy">Results</h3>

                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="text-sm font-medium text-muted">Monthly cost</div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-lg line-through text-muted/60">~$945</span>
                        <span aria-hidden="true" className="text-muted">
                          &rarr;
                        </span>
                        <span className="text-xl font-bold text-accent">~$30&ndash;50</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted">Early termination fee</div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-lg line-through text-muted/60">~$5,000</span>
                        <span aria-hidden="true" className="text-muted">
                          &rarr;
                        </span>
                        <span className="text-xl font-bold text-accent">$0</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted">Lines</div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-lg line-through text-muted/60">4 (2 unused)</span>
                        <span aria-hidden="true" className="text-muted">
                          &rarr;
                        </span>
                        <span className="text-xl font-bold text-accent">2 active</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted">FCC resolution</div>
                      <div className="mt-1 text-xl font-bold text-accent">15 days</div>
                    </div>

                    <div className="border-t border-border pt-5">
                      <div className="text-sm font-medium text-muted">Estimated annual savings</div>
                      <div className="mt-1 text-2xl font-bold text-navy">$10,000+</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Services                                                    */}
        {/* ============================================================ */}
        <section className="bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn animation="fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">What I do</h2>
            </FadeIn>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {[
                {
                  title: "Telecom Audit",
                  desc: "I review your current phone setup \u2014 what you're paying, what you're actually using, and what you could be paying instead. Most businesses I've worked with are paying 5\u201320x what modern alternatives cost. The audit is free.",
                },
                {
                  title: "VoIP Migration",
                  desc: "I handle the full transition from legacy POTS to VoIP \u2014 provider selection, hardware, configuration, number porting, and testing. You keep your existing phone numbers. Your customers won't notice a thing except maybe better call quality.",
                },
                {
                  title: "Carrier Dispute & Advocacy",
                  desc: "If your carrier hits you with unauthorized contracts, surprise ETFs, or tries to block your port, I know how to fight it. I'll build your case and help you file complaints with the FCC and California PUC.",
                },
                {
                  title: "Ongoing Support",
                  desc: "VoIP systems need occasional attention \u2014 adding lines, configuring auto-attendants, adjusting call routing. I provide ongoing support so you're never stuck calling a 1-800 number and waiting on hold.",
                },
              ].map((service, i) => (
                <FadeIn key={service.title} animation="fade-in" delay={i * 0.1}>
                  <div className="h-full rounded-xl border border-border bg-surface-light p-6 transition-all hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg">
                    <h3 className="text-lg font-semibold text-navy">{service.title}</h3>
                    <p className="mt-3 text-muted leading-relaxed">{service.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Interactive Checklist                                       */}
        {/* ============================================================ */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn animation="fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Signs your carrier is taking advantage of you
              </h2>
            </FadeIn>

            <FadeIn animation="fade-in" delay={0.1}>
              <div className="mt-8 space-y-3">
                {checklistItems.map((item, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                      checked[i]
                        ? "border-accent/40 bg-accent/5"
                        : "border-border hover:border-accent/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked[i]}
                      onChange={() =>
                        setChecked((prev) => {
                          const next = [...prev];
                          next[i] = !next[i];
                          return next;
                        })
                      }
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-accent accent-accent"
                    />
                    <span
                      className={`text-sm sm:text-base ${checked[i] ? "text-foreground" : "text-muted"}`}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>

              {/* Tally result */}
              <div
                className={`mt-6 rounded-xl border p-5 transition-all ${
                  checkedCount === 0
                    ? "border-border bg-surface"
                    : checkedCount < 3
                      ? "border-accent/30 bg-accent/5"
                      : "border-accent bg-accent/10"
                }`}
              >
                {checkedCount === 0 ? (
                  <p className="text-muted">Check any that apply to see your risk level.</p>
                ) : checkedCount < 3 ? (
                  <p className="text-foreground">
                    <span className="font-semibold">{checkedCount} checked.</span> You&apos;re
                    probably overpaying. A free audit would tell you exactly how much.
                  </p>
                ) : (
                  <p className="text-foreground">
                    <span className="font-semibold text-accent">{checkedCount} checked.</span> Your
                    carrier is counting on you not doing anything about it. Let&apos;s change that.
                  </p>
                )}
                {checkedCount > 0 && (
                  <button
                    onClick={scrollToForm}
                    className="mt-3 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-bright"
                  >
                    Get a Free Audit
                  </button>
                )}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Why Me                                                      */}
        {/* ============================================================ */}
        <section className="bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <FadeIn animation="fade-in-up">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                  Why I do this
                </h2>
                <div className="mt-6 space-y-4 text-muted leading-relaxed sm:text-lg">
                  <p>
                    I&apos;m Tyler Vigario, an independent IT consultant based in California&apos;s
                    Central Valley. I&apos;m not a telecom vendor. I&apos;m not an AT&amp;T
                    reseller. I don&apos;t take commissions from carriers. I work for the client,
                    not the phone company.
                  </p>
                  <p>
                    I got into this because I saw a client &mdash; a family business that&apos;s
                    been around since 1979 &mdash; getting squeezed by their carrier for thousands
                    of dollars on service they weren&apos;t even fully using. When they tried to
                    leave, the carrier generated a contract they never agreed to and threatened a
                    $5,000 fee. That&apos;s not right. I helped them fight it, and now I help other
                    businesses do the same.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { value: "20+", label: "years in tech" },
                    { value: "0", label: "carrier commissions" },
                    { value: "100%", label: "client-side" },
                    { value: "15 days", label: "FCC resolution" },
                  ].map((cred) => (
                    <div key={cred.label} className="text-center">
                      <div className="text-xl font-bold text-accent sm:text-2xl">{cred.value}</div>
                      <div className="mt-1 text-xs text-muted sm:text-sm">{cred.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  FAQ                                                         */}
        {/* ============================================================ */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <FadeIn animation="fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Frequently asked questions
              </h2>
            </FadeIn>

            <FadeIn animation="fade-in" delay={0.1}>
              <div className="mt-8">
                {faqs.map((faq) => (
                  <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Contact / CTA                                               */}
        {/* ============================================================ */}
        <section ref={formRef} className="scroll-mt-24 bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Left — copy */}
              <FadeIn animation="fade-in-up">
                <div className="lg:py-4">
                  <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                    Stop overpaying. Start here.
                  </h2>
                  <p className="mt-4 text-lg text-muted">
                    Tell me about your current phone setup and I&apos;ll tell you exactly what you
                    could be saving &mdash; free, no strings attached.
                  </p>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3 text-muted">
                      <PhoneIcon className="h-5 w-5 shrink-0 text-accent" />
                      <span>
                        Rather talk?{" "}
                        <a
                          href="tel:+15599001400"
                          className="inline-block py-2.5 -my-2.5 font-medium text-foreground hover:text-accent"
                        >
                          (559) 900-1400
                        </a>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted">
                      <EmailIcon className="h-5 w-5 shrink-0 text-accent" />
                      <span>
                        Email:{" "}
                        <a
                          href="mailto:tyler@tylervigario.com"
                          className="inline-block py-2.5 -my-2.5 font-medium text-foreground hover:text-accent"
                        >
                          tyler@tylervigario.com
                        </a>
                      </span>
                    </div>
                  </div>

                  <div className="mt-10 space-y-3 text-sm text-muted">
                    {[
                      "Free audit \u2014 no obligation, no sales pitch",
                      "Independent consultant \u2014 no carrier commissions",
                      "Central Valley on-site \u2014 remote available anywhere",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Right — form */}
              <FadeIn animation="fade-in-scale" delay={0.1}>
                <div className="rounded-2xl border border-border bg-surface-light p-6 sm:p-8">
                  {status === "sent" ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 inline-flex rounded-full bg-accent-soft p-3 text-accent">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-8 w-8"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-navy">Got it!</h3>
                      <p className="mt-2 text-muted">
                        I&apos;ll review your setup and get back to you soon.
                      </p>
                      <button
                        onClick={() => setStatus("idle")}
                        className="mt-6 rounded-lg border border-border px-4 py-3 text-sm text-muted transition-colors hover:border-accent/30 hover:text-foreground"
                      >
                        Submit another request
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        void handleSubmit(e);
                      }}
                      className="space-y-5"
                    >
                      <div>
                        <label
                          htmlFor="pots-business"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Business name
                        </label>
                        <input
                          id="pots-business"
                          type="text"
                          required
                          autoComplete="organization"
                          value={form.business}
                          onChange={(e) => setForm({ ...form, business: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="Acme Co."
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pots-name"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Your name
                        </label>
                        <input
                          id="pots-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="Jane Smith"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pots-contact"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Phone or email
                        </label>
                        <input
                          id="pots-contact"
                          type="text"
                          required
                          autoComplete="email"
                          value={form.contact}
                          onChange={(e) => setForm({ ...form, contact: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="you@example.com or (559) 555-1234"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pots-bill"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          Current monthly phone bill{" "}
                          <span className="font-normal text-muted">(approximate)</span>
                        </label>
                        <select
                          id="pots-bill"
                          required
                          value={form.bill}
                          onChange={(e) => setForm({ ...form, bill: e.target.value })}
                          className={`w-full rounded-lg border border-border bg-background px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
                            form.bill ? "text-foreground" : "text-muted/60"
                          }`}
                        >
                          <option value="" disabled>
                            Select a range
                          </option>
                          {billRanges.map((range) => (
                            <option key={range} value={range}>
                              {range}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="pots-details"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          What&apos;s going on?{" "}
                          <span className="font-normal text-muted">(optional)</span>
                        </label>
                        <textarea
                          id="pots-details"
                          rows={4}
                          value={form.details}
                          onChange={(e) => setForm({ ...form, details: e.target.value })}
                          className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder="How many lines do you have? Have you received any surprise contracts or fee notices? Any other details."
                        />
                      </div>

                      {status === "error" && (
                        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                          <span>{errorMsg}</span>
                          <button
                            type="submit"
                            className="ml-3 shrink-0 py-2.5 -my-2.5 font-medium underline hover:no-underline"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={status === "sending"}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {status === "sending" ? (
                          <>
                            <svg
                              className="h-5 w-5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          "Request a Free Audit"
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/*  Footer                                                      */}
      {/* ============================================================ */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
            <Link href="/" className="inline-block py-2">
              <Image
                src="/images/vts-logo.png"
                alt="Vigario Technology Solutions"
                width={330}
                height={124}
                className="h-6 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <a href="tel:+15599001400" className="py-2 transition-colors hover:text-foreground">
                (559) 900-1400
              </a>
              <span className="text-border">|</span>
              <a
                href="mailto:tyler@tylervigario.com"
                className="py-2 transition-colors hover:text-foreground"
              >
                tyler@tylervigario.com
              </a>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-muted">
            &copy; {new Date().getFullYear()} Vigario Technology Solutions. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
