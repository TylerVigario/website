import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <address className="not-italic text-center md:text-left">
            <Link href="/" className="inline-block py-2">
              <Image
                src="/images/vts-logo.png"
                alt="Vigario Technology Solutions"
                width={330}
                height={124}
                className="h-7 w-auto"
              />
            </Link>
            <p className="mt-2 text-sm text-muted">
              Fresno, CA &middot; Available remotely nationwide
            </p>
          </address>

          <nav
            className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted md:gap-6"
            aria-label="Footer navigation"
          >
            <Link href="/services" className="py-3 transition-colors hover:text-foreground">
              Services
            </Link>
            <span className="hidden text-border md:inline">|</span>
            <Link href="/about" className="py-3 transition-colors hover:text-foreground">
              About
            </Link>
            <span className="hidden text-border md:inline">|</span>
            <Link href="/contact" className="py-3 transition-colors hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-muted md:flex-row md:justify-center md:gap-6">
          <a href="tel:+15599001400" className="py-3 transition-colors hover:text-foreground">
            (559) 900-1400
          </a>
          <span className="hidden text-border md:inline">|</span>
          <a
            href="mailto:tyler@tylervigario.com"
            className="py-3 transition-colors hover:text-foreground"
          >
            tyler@tylervigario.com
          </a>
          <span className="hidden text-border md:inline">|</span>
          <a
            href="https://github.com/tylervigario"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 py-3 transition-colors hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4 text-[#333]"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <span className="hidden text-border md:inline">|</span>
          <a
            href="https://g.co/kgs/wyVQ2pD"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 py-3 transition-colors hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4 text-[#EA4335]"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            Google Business
          </a>
        </div>

        <div className="mt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} Vigario Technology Solutions. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
