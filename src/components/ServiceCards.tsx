"use client";

import { useEffect, useRef } from "react";

interface Service {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export default function ServiceCards({ services }: { services: Service[] }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const cards = grid.querySelectorAll<HTMLElement>("[data-card]");
          cards.forEach((card, i) => {
            setTimeout(() => card.classList.add("visible"), i * 100);
          });
          observer.unobserve(grid);
        }
      },
      { rootMargin: "-50px 0px" }
    );

    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <div
          key={s.title}
          data-card
          onClick={() => {
            window.dispatchEvent(new CustomEvent("select-service", { detail: s.title }));
            document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="fade-in group cursor-pointer rounded-2xl border border-border bg-surface-light p-6 transition-all sm:p-8 hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="mb-5 inline-flex rounded-xl bg-accent-soft p-3 text-accent">
            {s.icon}
          </div>
          <h3 className="mb-3 text-xl font-semibold text-navy">{s.title}</h3>
          <p className="leading-relaxed text-muted">{s.desc}</p>
          <a
            href="#contact"
            onClick={(e) => e.preventDefault()}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100"
          >
            Get a quote
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      ))}
    </div>
  );
}
