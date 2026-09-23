import type { APIRoute } from "astro";
import { notFound } from "@/lib/api/error";

/**
 * Anything under /api/ that no other route claims.
 *
 * Without it Astro falls through to the site's HTML 404 page, so a
 * client that asked for JSON is handed a document — and cannot tell a
 * wrong path from a broken deployment without parsing markup. Astro
 * prefers a specific route over a rest parameter, so the real endpoints
 * are unaffected; this only catches what would otherwise have been a
 * page.
 */
export const prerender = false;

export const ALL: APIRoute = () => notFound();
