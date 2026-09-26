import type { APIRoute } from "astro";
import { methodNotAllowed, zodError } from "@/lib/api/error";
import { readSubmission, submitPotsAudit } from "@/lib/api/submit";

export const prerender = false;

/**
 * The enhanced path: JSON in, JSON out, Problem Details on failure. The
 * work itself is submitPotsAudit(), shared with the page that takes the no-JS
 * submit, so the two cannot disagree.
 */
export const POST: APIRoute = async ({ request }) => {
  // A plain HTML submit belongs to the page, which can re-render the form
  // with what was typed. 307, not 303: it makes the browser repeat the
  // POST, body and all, so a page loaded before the forms stopped posting
  // here still lands its submission, with nothing lost.
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return new Response(null, { status: 307, headers: { Location: "/pots-migration#audit" } });
  }

  const outcome = await submitPotsAudit(await readSubmission(request));
  if (outcome.kind === "invalid") return zodError(outcome.failure);
  // "dropped" answers exactly as "saved" does: see submit.ts.
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/** Any other method. A specific export wins over ALL in Astro, so POST
 *  above still handles POST; this exists so the rest get 405 with an
 *  Allow header instead of the site's HTML 404. */
export const ALL: APIRoute = () => methodNotAllowed(["POST"]);
