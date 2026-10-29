import * as z from "zod/mini";
import { MAX, tooLong } from "@/lib/forms/limits";
import { services as catalog } from "@/lib/services";

// The quote form's shape, enforced wherever a quote is submitted
// (src/lib/api/submit.ts, for both the JSON API and the no-JS page).
// Trims are part of the schema, so nothing downstream re-trims, and
// lengths are measured after trimming. Messages are user-facing: they
// render beside the field, and src/lib/forms/rules.ts repeats them in
// the browser, verified by tests/form-rules.test.ts.
export const QuoteRequest = z.object({
  name: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "Please enter your name."),
      z.maxLength(MAX.name, tooLong(MAX.name)),
    ),
  contact: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "Please enter a phone number or email."),
      z.maxLength(MAX.contact, tooLong(MAX.contact)),
    ),
  // Only the catalog's titles, which is all the form's checkboxes can
  // send. Anything else is a request the form did not make, and one of
  // them was POTS_AUDIT_MARKER: a quote could store the audit's marker
  // and pass for an audit in a table where that string is the only thing
  // telling the two apart.
  services: z
    .array(
      z.enum(
        catalog.map((s) => s.title) as [string, ...string[]],
        "Pick from the listed services.",
      ),
    )
    .check(
      z.minLength(1, "Pick at least one service."),
      // No more than the catalog holds, which is all the form can send.
      // zod reads a bound before the items (since 4.6.6), so a list of
      // thousands of junk entries is one error, not one per entry: without
      // it, a 120 KB list came back as a 4 MB error response, and the
      // longest list the body limit allows made the parse throw.
      z.maxLength(catalog.length, "Pick from the listed services."),
    ),
  details: z.optional(z.string().check(z.trim(), z.maxLength(MAX.details, tooLong(MAX.details)))),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;
