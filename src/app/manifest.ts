import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vigario Technology Solutions",
    short_name: "VTS",
    description: "IT Services in Fresno, CA",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#3b82c4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
