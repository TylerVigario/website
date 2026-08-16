import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";
import { PotsAuditRequest } from "@/lib/api/pots-audit";
import { zodError } from "@/lib/api/error";
import { sendPotsAuditNotification } from "@/lib/email/mailer";

export const prerender = false;

async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return await request.json().catch(() => null);
  const form = await request.formData().catch(() => null);
  if (!form) return null;
  // FormData values may be File, which stringifies to "[object File]".
  // This form has no upload, so a non-string entry is not ours to read.
  return Object.fromEntries(
    Array.from(form.keys()).map((k) => {
      const v = form.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  );
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");
  const body = await readBody(request);
  const parsed = PotsAuditRequest.safeParse(body);

  if (!parsed.success) {
    if (wantsJson) return zodError(parsed);
    const values = encodeURIComponent(JSON.stringify(body ?? {}));
    const errors = encodeURIComponent(
      JSON.stringify(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0] ?? "(root)"), i.message]),
        ),
      ),
    );
    return redirect(`/pots-migration?v=${values}&e=${errors}#audit`, 303);
  }

  const { business, name, contact, bill, details } = parsed.data;

  // Both forms land in the same table; `services` is what distinguishes
  // them, carrying the literal marker for an audit rather than a list.
  const db = getDb();
  db.prepare("INSERT INTO quotes (name, contact, services, details) VALUES (?, ?, ?, ?)").run(
    name,
    contact,
    "POTS Migration Audit",
    [`Business: ${business}`, `Monthly bill: ${bill}`, details].filter(Boolean).join("\n"),
  );

  try {
    await sendPotsAuditNotification({ business, name, contact, bill, details });
  } catch (emailErr) {
    // Best-effort; the row is already saved. journald has the detail.
    console.error("Failed to send email notification:", emailErr);
  }

  if (wantsJson) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return redirect("/pots-migration?sent=1#audit", 303);
};
