import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://tylervigario.com",
      lastModified: "2026-02-16",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
