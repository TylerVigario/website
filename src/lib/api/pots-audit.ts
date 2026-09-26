import * as z from "zod/mini";
import { MAX, tooLong } from "@/lib/forms/limits";

// The POTS audit form's shape, enforced wherever an audit is submitted
// (src/lib/api/submit.ts, for both the JSON API and the no-JS page).
// Messages are user-facing: they render beside the field, and
// src/lib/forms/rules.ts repeats them in the browser, verified by
// tests/form-rules.test.ts.
/** What the bill select offers, and so all the schema accepts. Exported
 *  for PotsAuditForm, which renders the options from it. */
export const BILL_RANGES = ["$100–$300", "$300–$500", "$500–$1,000", "$1,000+"] as const;

export const PotsAuditRequest = z.object({
  business: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "Please enter the business name."),
      z.maxLength(MAX.business, tooLong(MAX.business)),
    ),
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
  bill: z.enum(BILL_RANGES, "Pick a range."),
  details: z.optional(z.string().check(z.trim(), z.maxLength(MAX.details, tooLong(MAX.details)))),
});
export type PotsAuditRequest = z.infer<typeof PotsAuditRequest>;

/**
 * The literal written into `services` for an audit submission.
 *
 * Both forms land in one table and this string is the only thing telling
 * the two kinds of row apart. Changing or mistyping it does not fail
 * anything — it silently makes audits indistinguishable from quotes,
 * for every row written afterwards and with nothing to detect it later.
 *
 * Exported so the route and the test that guards it read the same
 * constant rather than two copies of a string.
 */
export const POTS_AUDIT_MARKER = "POTS Migration Audit";
