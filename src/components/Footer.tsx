export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/5 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="text-lg font-bold tracking-tight">
              <span className="text-accent-bright">V</span>igario
              <span className="ml-1 text-sm font-normal text-muted">Technology Solutions</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Fresno, CA &middot; Available remotely nationwide
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="tel:+15599001400" className="transition-colors hover:text-foreground">
              (559) 900-1400
            </a>
            <span className="text-white/10">|</span>
            <a href="mailto:tyler@vigario.tech" className="transition-colors hover:text-foreground">
              tyler@vigario.tech
            </a>
            <span className="text-white/10">|</span>
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
