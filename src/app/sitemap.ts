import type { MetadataRoute } from "next";

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
