import * as z from "zod/mini";
import { MAX, tooLong } from "@/lib/forms/limits";
import { oneLine } from "@/lib/api/one-line";
import { atOurDomain, OUR_DOMAIN_MESSAGE } from "@/lib/forms/our-domain";
import { services as catalog } from "@/lib/services";

const NAME = "Please enter your name.";
const CONTACT = "Please enter a phone number or email.";
const SERVICES = "Pick at least one service.";

// The quote form's shape, enforced wherever a quote is submitted
// (src/lib/api/submit.ts, for both the JSON API and the no-JS page).
// Trims are part of the schema, so nothing downstream re-trims, and
// lengths are measured after trimming. Messages are user-facing: they
// render beside the field, and src/lib/forms/rules.ts repeats them in
// the browser, verified by tests/form-rules.test.ts.
//
// Every check names its message, the type's included. A field left out,
// or sent as something no form control produces, which only a script
// does, gets the message it gives when empty; a body that is not an
// object gets one of its own. A message zod supplies comes from whichever
// locale the server's bundle happens to load, and zod/mini alone loads
// none, which reads "Invalid input".
export const QuoteRequest = z.object(
  {
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
        SERVICES,
      )
      .check(
        z.minLength(1, SERVICES),
        // No more than the catalog holds, which is all the form can send.
        // zod reads a bound before the items (since 4.6.6), so a list of
        // thousands of junk entries is one error, not one per entry: without
        // it, a 120 KB list came back as a 4 MB error response, and the
        // longest list the body limit allows made the parse throw.
        z.maxLength(catalog.length, "Pick from the listed services."),
      ),
    details: z.optional(
      z
        .string("Please write the details as text.")
        .check(z.trim(), z.maxLength(MAX.details, tooLong(MAX.details))),
    ),
  },
  "That submission could not be read. Please send it again.",
);
export type QuoteRequest = z.infer<typeof QuoteRequest>;
