import type { MetadataRoute } from "next";
import { caseStudies } from "@/lib/work";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://tylervigario.com",
      lastModified: "2026-02-16",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://tylervigario.com/services",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tylervigario.com/services/networking",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tylervigario.com/services/security-cameras",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tylervigario.com/services/windows",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tylervigario.com/services/linux",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://tylervigario.com/work",
      lastModified: "2026-07-22",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Per-case-study pages, generated from the shared data module so the
    // sitemap can't drift when a study is added or removed.
    ...caseStudies.map((cs) => ({
      url: `https://tylervigario.com${cs.href}`,
      lastModified: cs.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: "https://tylervigario.com/about",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://tylervigario.com/contact",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://tylervigario.com/pots-migration",
      lastModified: "2026-04-02",
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
