"use client";

import { useEffect, useRef } from "react";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-in" | "fade-in-up" | "fade-in-scale";
  delay?: number;
  margin?: string;
}

export default function FadeIn({
  children,
  className = "",
  animation = "fade-in",
  delay = 0,
  margin = "-100px",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            setTimeout(() => el.classList.add("visible"), delay * 1000);
          } else {
            el.classList.add("visible");
          }
          observer.unobserve(el);
        }
      },
      { rootMargin: `${margin} 0px` },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, margin]);

  return (
    <div ref={ref} className={`${animation} ${className}`}>
      {children}
    </div>
  );
}
