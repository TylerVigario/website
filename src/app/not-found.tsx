import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-bright"
        >
          Go home
        </Link>
        <Link
          href="/contact"
          className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-surface"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
