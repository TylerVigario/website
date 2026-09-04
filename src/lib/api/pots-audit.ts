import * as z from "zod/mini";

// Shared shape for /api/pots-audit — used by the route handler to
// validate the inbound POST body and by POTSLanding to construct it.
// Messages are user-facing: they surface inline next to inputs (via
// the zodResolver client-side) and inside Problem Details errors[]
// when the server rejects (via zodError() → setError()).
export const PotsAuditRequest = z.object({
  business: z.string().check(z.trim(), z.minLength(1, "Please enter the business name.")),
  name: z.string().check(z.trim(), z.minLength(1, "Please enter your name.")),
  contact: z.string().check(z.trim(), z.minLength(1, "Please enter a phone number or email.")),
  bill: z.string().check(z.trim(), z.minLength(1, "Pick a range.")),
  details: z.optional(z.string().check(z.trim())),
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
