import type { APIRoute } from "astro";
import { notFound } from "@/lib/api/error";

/**
 * What the server answers at /_image, in place of Astro's image endpoint
 * (`image.endpoint.entrypoint` in astro.config.ts).
 *
 * Astro injects that endpoint into every server build, to make images on
 * request. This server makes none: sharp makes every variant at build
 * time, and no page links to /_image, the two rendered per request
 * included, which check:forms holds. Left in place, it was an endpoint no
 * page uses that reads files under dist/client named by its query string,
 * and Astro has published advisories against it (GHSA-m8p5-r7qv-cx4c,
 * GHSA-r3h5-4585-7x3w). So it answers as an unclaimed path under /api/
 * does.
 */
export const ALL: APIRoute = () => notFound();
