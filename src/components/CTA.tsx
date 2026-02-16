"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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

  function toggleService(service: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <section id="contact" className="relative pb-8 pt-16 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left — copy */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                Get a free quote
              </h2>
              <p className="mt-4 text-lg text-muted">
                Tell me a bit about what you need and I&apos;ll get back to you
                with a clear scope and honest estimate. No obligations.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                  </svg>
                  <span>Rather talk? <a href="tel:+15599001400" className="font-medium text-foreground hover:text-accent">(559) 900-1400</a></span>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                  </svg>
                  <span>Email: <a href="mailto:tyler@vigario.tech" className="font-medium text-foreground hover:text-accent">tyler@vigario.tech</a></span>
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
                  <p className="mt-2 text-muted">I&apos;ll review your request and get back to you soon.</p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-sm text-accent hover:underline"
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
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Tyler Vigario"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact" className="mb-1.5 block text-sm font-medium text-foreground">
                      Phone or email
                    </label>
                    <input
                      id="contact"
                      type="text"
                      required
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
                          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
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
                    <p className="text-sm text-red-600">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === "sending" ? "Sending..." : "Request a free quote"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
