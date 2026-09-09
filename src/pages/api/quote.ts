import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";
import { QuoteRequest } from "@/lib/api/quote";
import { zodError } from "@/lib/api/error";
import { sendQuoteNotification } from "@/lib/email/mailer";

// The one thing on this route that opts out of prerendering. Everything
// else on the site is a file on disk; this needs a process.
export const prerender = false;

/**
 * Accepts both shapes, because the form has two paths:
 *
 *   application/json          the enhanced path — fetch, no navigation
 *   form-urlencoded           the no-JS path — a plain HTML submit
 *
 * The second is why this exists at all. A form that only works with
 * JavaScript is one failed script away from silently swallowing the
 * only thing this site is for.
 */
async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    // Malformed JSON becomes a 400 rather than an unhandled throw.
    return await request.json().catch(() => null);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return null;

  const out: Record<string, string | string[]> = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key).filter((v): v is string => typeof v === "string");
    // `services` is a checkbox group and must stay an array even when
    // exactly one box is ticked, or the schema sees a string.
    out[key] = key === "services" ? all : (all[0] ?? "");
  }
  if (!("services" in out)) out.services = [];
  return out;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const body = await readBody(request);
  const parsed = QuoteRequest.safeParse(body);

  if (!parsed.success) {
    if (wantsJson) return zodError(parsed);
    // No-JS path. Hand the submitted values and the errors back to the
    // page so it re-renders with everything the user typed still in
    // place. Nothing is ever thrown away because it failed validation.
    const values = encodeURIComponent(JSON.stringify(body ?? {}));
    const errors = encodeURIComponent(
      JSON.stringify(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0] ?? "(root)"), i.message]),
        ),
      ),
    );
    return redirect(`/contact?v=${values}&e=${errors}`, 303);
  }

  const { name, contact, services, details } = parsed.data;

  const db = getDb();
  db.prepare("INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)").run(
    name,
    contact,
    services.join(", "),
    details || null,
  );

  try {
    await sendQuoteNotification({ name, contact, services, details });
  } catch (emailErr) {
    // Best-effort. The row is already saved; the mailer logs the
    // failure with redacted context and rethrows. Errors land on
    // stdout, for whatever supervises the process to collect.
    console.error("Failed to send email notification:", emailErr);
  }

  if (wantsJson) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return redirect("/contact?sent=1", 303);
};
