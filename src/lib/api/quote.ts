import * as z from "zod/mini";
import { MAX, tooLong } from "@/lib/forms/limits";

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
  services: z
    .array(z.string().check(z.trim(), z.minLength(1)))
    .check(z.minLength(1, "Pick at least one service.")),
  details: z.optional(z.string().check(z.trim(), z.maxLength(MAX.details, tooLong(MAX.details)))),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;
