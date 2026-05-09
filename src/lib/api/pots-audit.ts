import { z } from "zod";

// Shared shape for /api/pots-audit — used by the route handler to
// validate the inbound POST body and by POTSLanding to construct it.
// Messages are user-facing: they surface inline next to inputs (via
// the zodResolver client-side) and inside Problem Details errors[]
// when the server rejects (via zodError() → setError()).
export const PotsAuditRequest = z.object({
  business: z.string().trim().min(1, "Please enter the business name."),
  name: z.string().trim().min(1, "Please enter your name."),
  contact: z.string().trim().min(1, "Please enter a phone number or email."),
  bill: z.string().trim().min(1, "Pick a range."),
  details: z.string().trim().optional(),
});
export type PotsAuditRequest = z.infer<typeof PotsAuditRequest>;
