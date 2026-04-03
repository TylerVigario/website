"use client";

import { useState, useEffect, useCallback } from "react";
import { services } from "@/lib/services";

const serviceOptions = services.map((s) => s.title);

interface ContactFormProps {
  initialService?: string;
}

export default function ContactForm({ initialService }: ContactFormProps) {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    services: [] as string[],
    details: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Pre-select service from URL param
  useEffect(() => {
    if (initialService && serviceOptions.includes(initialService)) {
      setForm((prev) => ({
        ...prev,
        services: prev.services.includes(initialService)
          ? prev.services
          : [...prev.services, initialService],
      }));
    }
  }, [initialService]);

  const toggleService = useCallback((service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
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

  if (status === "sent") {
    return (
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
    );
  }

  return (
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
  );
}
