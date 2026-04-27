"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const links = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center py-1.5">
          <Image
            src="/images/vts-logo.png"
            alt="Vigario Technology Solutions"
            width={330}
            height={124}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`py-3 text-sm transition-colors hover:text-foreground ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "text-accent font-medium"
                  : "text-muted"
              }`}
            >
              {l.label}
            </Link>
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
          aria-expanded={open}
        >
          <span
            className={`h-0.5 w-6 bg-foreground transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-foreground transition-opacity ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-foreground transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out border-t border-border md:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 px-6 py-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`py-2.5 transition-colors hover:text-foreground ${
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "text-accent font-medium"
                    : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href="tel:+15599001400"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-accent px-5 py-3 text-center font-semibold text-white"
            >
              (559) 900-1400
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
