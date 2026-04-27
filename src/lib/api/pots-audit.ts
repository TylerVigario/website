import { z } from "zod";

// Shared shape for /api/pots-audit — used by the route handler to
// validate the inbound POST body and by POTSLanding to construct it.
export const PotsAuditRequest = z.object({
  business: z.string().trim().min(1),
  name: z.string().trim().min(1),
  contact: z.string().trim().min(1),
  bill: z.string().trim().min(1),
  details: z.string().trim().optional(),
});
export type PotsAuditRequest = z.infer<typeof PotsAuditRequest>;
