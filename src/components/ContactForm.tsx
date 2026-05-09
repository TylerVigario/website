"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { services as serviceCatalog } from "@/lib/services";
import { QuoteRequest } from "@/lib/api/quote";
import { ProblemDetails } from "@/lib/api/error";

const serviceOptions = serviceCatalog.map((s) => s.title);

// Field-name guard for Problem Details errors[].field strings.
// Derived from the zod schema so it can't drift if a field is added.
const FIELD_NAMES = Object.keys(QuoteRequest.shape) as (keyof QuoteRequest)[];
function isFieldName(field: string): field is keyof QuoteRequest {
  return (FIELD_NAMES as readonly string[]).includes(field);
}

interface ContactFormProps {
  initialService?: string;
}

type FormValues = QuoteRequest;

export default function ContactForm({ initialService }: ContactFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormValues>({
    resolver: zodResolver(QuoteRequest),
    // onTouched: stay quiet until the user tabs out of a field, then
    // validate on blur and re-validate on every keystroke. Pairs with
    // the default `reValidateMode: "onChange"` so server-set errors
    // auto-clear as the user fixes the field.
    mode: "onTouched",
    defaultValues: {
      name: "",
      contact: "",
      services: initialService && serviceOptions.includes(initialService) ? [initialService] : [],
      details: "",
    },
  });

  // Auto-dismiss the success view after 10s — calling reset() also
  // flips isSubmitSuccessful back to false, putting the form back.
  useEffect(() => {
    if (!isSubmitSuccessful) return;
    const timer = setTimeout(() => reset(), 10000);
    return () => clearTimeout(timer);
  }, [isSubmitSuccessful, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    let res: Response;
    try {
      res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      setError("root", { type: "network", message: "Network error. Please try again." });
      return;
    }

    if (res.ok) return;

    // Map Problem Details errors[] back to inline field errors. If
    // the body isn't Problem Details (or all error fields are
    // unknown), fall back to a single banner-level message.
    const problem = ProblemDetails.safeParse(await res.json().catch(() => null));
    if (problem.success && problem.data.errors?.length) {
      let mappedAny = false;
      for (const e of problem.data.errors) {
        if (isFieldName(e.field)) {
          setError(e.field, { type: "server", message: e.message });
          mappedAny = true;
        }
      }
      if (mappedAny) return;
    }

    setError("root", {
      type: "server",
      message: problem.success
        ? (problem.data.detail ?? problem.data.title)
        : "Something went wrong.",
    });
  };

  if (isSubmitSuccessful) {
    return (
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
        <p className="mt-2 text-muted">We&apos;ll review your request and get back to you soon.</p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-lg border border-border px-4 py-3 text-sm text-muted transition-colors hover:border-accent/30 hover:text-foreground"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          Your name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          aria-required="true"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent aria-invalid:border-red-500"
          placeholder="Tyler Vigario"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1.5 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-info" className="mb-1.5 block text-sm font-medium text-foreground">
          Phone or email
        </label>
        <input
          id="contact-info"
          type="text"
          autoComplete="email"
          aria-required="true"
          aria-invalid={errors.contact ? true : undefined}
          aria-describedby={errors.contact ? "contact-error" : undefined}
          {...register("contact")}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent aria-invalid:border-red-500"
          placeholder="you@example.com or (559) 555-1234"
        />
        {errors.contact && (
          <p id="contact-error" role="alert" className="mt-1.5 text-sm text-red-600">
            {errors.contact.message}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-foreground">
          What do you need help with?
        </legend>
        <div
          className="flex flex-wrap gap-2"
          aria-describedby={errors.services ? "services-error" : undefined}
        >
          {serviceOptions.map((service) => (
            <label key={service} className="cursor-pointer">
              {/* Hidden checkbox is the source of truth — RHF aggregates
                  same-named checkboxes into the array on submit. peer-*
                  variants drive the visible chip styling. */}
              <input
                type="checkbox"
                value={service}
                {...register("services")}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center rounded-full border border-border px-3.5 py-2 text-sm text-muted transition-colors hover:border-accent/30 hover:text-foreground peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
                {service}
              </span>
            </label>
          ))}
        </div>
        {errors.services && (
          <p id="services-error" role="alert" className="mt-1.5 text-sm text-red-600">
            {errors.services.message}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="details" className="mb-1.5 block text-sm font-medium text-foreground">
          Tell me about your project <span className="text-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="details"
          rows={4}
          {...register("details")}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          placeholder="What's going on? What are you trying to accomplish? Any deadlines?"
        />
      </div>

      {errors.root && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{errors.root.message}</span>
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
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition-all hover:bg-accent-bright hover:shadow-lg hover:shadow-accent/15 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-5 w-5 motion-safe:animate-spin"
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
          "Request a free quote"
        )}
      </button>
    </form>
  );
}
