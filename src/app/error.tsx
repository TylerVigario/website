"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next catches this boundary BEFORE Sentry's auto-capture, so
    // manual capture is required — without it, errors that hit the
    // segment-level boundary are invisible to Sentry. The `digest`
    // hash on server-side errors lets us correlate this client event
    // with the matching server log entry.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <p className="text-sm font-medium text-accent">Error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-center text-muted">
        Sorry, the page hit a snag. Try again, or reach out and let us know what you were doing when
        this happened.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-bright"
        >
          Try again
        </button>
        <Link
          href="/contact"
          className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-surface"
        >
          Contact us
        </Link>
      </div>
      {error.digest && <p className="mt-8 text-xs text-muted">Error ID: {error.digest}</p>}
    </div>
  );
}
