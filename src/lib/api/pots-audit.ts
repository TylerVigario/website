import * as z from "zod/mini";
import { MAX, tooLong } from "@/lib/forms/limits";
import { oneLine } from "@/lib/api/one-line";
import { atOurDomain, OUR_DOMAIN_MESSAGE } from "@/lib/forms/our-domain";

/** What the bill select offers, and so all the schema accepts. Exported
 *  for PotsAuditForm, which renders the options from it. */
export const BILL_RANGES = ["$100–$300", "$300–$500", "$500–$1,000", "$1,000+"] as const;

const BUSINESS = "Please enter the business name.";
const NAME = "Please enter your name.";
const CONTACT = "Please enter a phone number or email.";

/** The POTS audit form's shape, enforced wherever an audit is submitted
 *  (src/lib/api/submit.ts, for both the JSON API and the no-JS page).
 *  Messages are user-facing: they render beside the field, and
 *  src/lib/forms/rules.ts repeats them in the browser, verified by
 *  tests/form-rules.test.ts. Every check names its message, the type's
 *  included, for the reason quote.ts gives. */
export const PotsAuditRequest = z.object(
  {
    business: z
      .string(BUSINESS)
      .check(
        oneLine,
        z.trim(),
        z.minLength(1, BUSINESS),
        z.maxLength(MAX.business, tooLong(MAX.business)),
      ),
    name: z
      .string(NAME)
      .check(oneLine, z.trim(), z.minLength(1, NAME), z.maxLength(MAX.name, tooLong(MAX.name))),
    contact: z.string(CONTACT).check(
      oneLine,
      z.trim(),
      z.minLength(1, CONTACT),
      z.maxLength(MAX.contact, tooLong(MAX.contact)),
      z.refine((v) => !atOurDomain(v), OUR_DOMAIN_MESSAGE),
    ),
    bill: z.enum(BILL_RANGES, "Pick a range."),
    details: z.optional(
      z
        .string("Please write the details as text.")
        .check(z.trim(), z.maxLength(MAX.details, tooLong(MAX.details))),
    ),
  },
  "That submission could not be read. Please send it again.",
);
export type PotsAuditRequest = z.infer<typeof PotsAuditRequest>;

/**
 * The literal written into `services` for an audit submission.
 *
 * Both forms land in one table and this string is the only thing telling
 * the two kinds of row apart. Changing or mistyping it does not fail
 * anything — it silently makes audits indistinguishable from quotes,
 * for every row written afterwards and with nothing to detect it later.
 *
 * Exported so the submit path and the test that guards it read the same
 * constant rather than two copies of a string.
 */
export const POTS_AUDIT_MARKER = "POTS Migration Audit";
