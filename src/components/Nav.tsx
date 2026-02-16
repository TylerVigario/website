"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = links.map((l) =>
      document.querySelector(l.href) as HTMLElement | null
    ).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center py-1.5"
        >
          <img
            src="/images/VTS Main Logo.png"
            alt="Vigario Technology Solutions"
            className="h-8 w-auto"
          />
        </a>

        {/* Desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`py-3 text-sm transition-colors hover:text-foreground ${
                active === l.href ? "text-accent font-medium" : "text-muted"
              }`}
            >
              {l.label}
            </a>
          ))}
          <a
            href="tel:+15599001400"
            className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-bright"
          >
            (559) 900-1400
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5 p-3 md:hidden"
          aria-label="Toggle menu"
        >
          <span className={`h-0.5 w-6 bg-foreground transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-6 bg-foreground transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-6 bg-foreground transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`py-2.5 transition-colors hover:text-foreground ${
                    active === l.href ? "text-accent font-medium" : "text-muted"
                  }`}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="tel:+15599001400"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg bg-accent px-5 py-3 text-center font-semibold text-white"
              >
                (559) 900-1400
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
