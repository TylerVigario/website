import { formKey } from "@/lib/db";
import { keepOrIssue, type FormName } from "@/lib/api/fill-time";

/**
 * The stamp a form renders with (fill-time.ts), signed with the key the
 * database holds.
 *
 * Rendering the form is the one place a page reads the database, and the
 * page carries more than the form: the footer's phone number and email,
 * for someone the form cannot help. So a key that cannot be read leaves
 * the stamp empty and the page whole, and the log says why. A submission
 * from that page is refused as stale, where it would have failed against
 * the same database anyway; /api/health reports the database itself.
 */
export function servedStamp(form: FormName, values: Record<string, string | string[]>): string {
  let key: Buffer;
  try {
    key = formKey();
  } catch (err) {
    console.error("[fill-time] serving a form without a stamp: its key could not be read:", err);
    return "";
  }
  return keepOrIssue(form, values, key);
}
