"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const serviceOptions = [
  "Networking & WiFi",
  "Security & Cameras",
  "Low-Voltage Cabling",
  "Computers, Servers & Cloud",
  "Custom Software",
  "IT Strategy & Support",
];

export default function CTA() {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    services: [] as string[],
    details: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleService = useCallback((service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  }, []);

  // Listen for service pre-selection from service cards
  useEffect(() => {
    function handleSelect(e: Event) {
      const service = (e as CustomEvent<string>).detail;
      if (serviceOptions.includes(service)) {
        setForm((prev) => ({
          ...prev,
          services: prev.services.includes(service) ? prev.services : [...prev.services, service],
        }));
        setStatus("idle");
      }
    }
    window.addEventListener("select-service", handleSelect);
    return () => window.removeEventListener("select-service", handleSelect);
  }, []);

  // Auto-reset success state after 10 seconds
  useEffect(() => {
    if (status !== "sent") return;
    const timer = setTimeout(() => setStatus("idle"), 10000);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("sent");
      setForm({ name: "", contact: "", services: [], details: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { rootMargin: "-100px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="contact" className="relative scroll-mt-24 pb-8 pt-16 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <div ref={sectionRef} className="fade-in">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left — copy */}
            <div className="lg:py-4">
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                Get a free quote
              </h2>
              <p className="mt-4 text-lg text-muted">
                Tell us a bit about what you need and we&apos;ll get back to you
                with a clear scope and honest estimate &mdash; free, before you
                commit to anything.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                  </svg>
                  <span>Rather talk? <a href="tel:+15599001400" className="inline-block py-2.5 -my-2.5 font-medium text-foreground hover:text-accent">(559) 900-1400</a></span>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                  </svg>
                  <span>Email: <a href="mailto:tyler@tylervigario.com" className="inline-block py-2.5 -my-2.5 font-medium text-foreground hover:text-accent">tyler@tylervigario.com</a></span>
                </div>
              </div>

              <div className="mt-10 space-y-3 text-sm text-muted">
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>Transparent hourly rate &mdash; no retainers, no hidden fees</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>Scope and estimate before any work starts</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>Fresno area on-site &mdash; remote available anywhere</span>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div className="rounded-2xl border border-border bg-surface-light p-6 sm:p-8">
              {status === "sent" ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 inline-flex rounded-full bg-accent-soft p-3 text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-navy">Got it!</h3>
                  <p className="mt-2 text-muted">We&apos;ll review your request and get back to you soon.</p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 rounded-lg border border-border px-4 py-3 text-sm text-muted transition-colors hover:border-accent/30 hover:text-foreground"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                      Your name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Tyler Vigario"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-info" className="mb-1.5 block text-sm font-medium text-foreground">
                      Phone or email
                    </label>
                    <input
                      id="contact-info"
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
                    <span className="mb-2 block text-sm font-medium text-foreground">
                      What do you need help with?
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions.map((service) => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggleService(service)}
                          className={`min-h-11 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                            form.services.includes(service)
                              ? "border-accent bg-accent text-white"
                              : "border-border text-muted hover:border-accent/30 hover:text-foreground"
                          }`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="details" className="mb-1.5 block text-sm font-medium text-foreground">
                      Tell me about your project <span className="text-muted font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="details"
                      rows={4}
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                      placeholder="What's going on? What are you trying to accomplish? Any deadlines?"
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === "sending" ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      "Request a free quote"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
