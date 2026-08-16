/**
 * Notification email bodies, as plain HTML.
 *
 * These were react-email components, which meant React and its types
 * stayed in the dependency tree solely to render two internal emails
 * that only ever reach one inbox. Templates are strings now and React
 * is gone entirely.
 *
 * Deliberately plain: table-free, inline-styled, no web fonts, no
 * images. Mail clients are a worse rendering target than any browser,
 * and this only has to be legible in one — the recipient reads it,
 * calls the number, and never sees it again.
 */

/** Escape anything a submitter typed. These bodies interpolate
 *  user-supplied strings into HTML, so this is the one place where
 *  forgetting would inject markup into the inbox. */
function esc(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Preserve the line breaks someone typed into a textarea. */
function paragraphs(value: string | undefined | null): string {
  const text = String(value ?? "").trim();
  if (!text) return '<p style="margin:0;color:#57534e">(none)</p>';
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#57534e;white-space:nowrap;vertical-align:top">${esc(label)}</td>
      <td style="padding:6px 0;color:#1c1917">${value}</td>
    </tr>`;
}

function layout(heading: string, submittedAt: string, body: string): string {
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#fafaf9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d6d3d1;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 4px;font-size:18px;color:#1e2a4a">${esc(heading)}</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#57534e">${esc(submittedAt)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${body}</table>
  </div>
</body></html>`;
}

export interface QuoteEmailArgs {
  name: string;
  contact: string;
  services: string[];
  details?: string;
  submittedAtFormatted: string;
}

export function renderQuoteEmail(a: QuoteEmailArgs): string {
  return layout(
    "New quote request",
    a.submittedAtFormatted,
    row("Name", esc(a.name)) +
      row("Contact", esc(a.contact)) +
      row("Services", esc(a.services.join(", "))) +
      row("Details", paragraphs(a.details)),
  );
}

export interface PotsAuditEmailArgs {
  business: string;
  name: string;
  contact: string;
  bill: string;
  details?: string;
  submittedAtFormatted: string;
}

export function renderPotsAuditEmail(a: PotsAuditEmailArgs): string {
  return layout(
    "New POTS audit request",
    a.submittedAtFormatted,
    row("Business", esc(a.business)) +
      row("Name", esc(a.name)) +
      row("Contact", esc(a.contact)) +
      row("Monthly bill", esc(a.bill)) +
      row("Details", paragraphs(a.details)),
  );
}
