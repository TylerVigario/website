export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <div className="text-lg font-bold tracking-tight">
              <span className="text-accent-bright">V</span>igario
              <span className="ml-1 text-sm font-normal text-muted">Technology Solutions</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Fresno, CA &middot; Available remotely nationwide
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 text-sm text-muted md:flex-row md:gap-6">
            <a href="tel:+15599001400" className="transition-colors hover:text-foreground">
              (559) 900-1400
            </a>
            <span className="hidden text-white/10 md:inline">|</span>
            <a href="mailto:tyler@vigario.tech" className="transition-colors hover:text-foreground">
              tyler@vigario.tech
            </a>
            <span className="hidden text-white/10 md:inline">|</span>
            <a
              href="https://github.com/tylervigario"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} Vigario Technology Solutions. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
