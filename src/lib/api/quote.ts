import { z } from "zod";

// Shared shape for /api/quote — used by the route handler to validate
// the inbound POST body and by ContactForm to construct it. Trims are
// part of the schema so the route doesn't need to re-trim.
export const QuoteRequest = z.object({
  name: z.string().trim().min(1),
  contact: z.string().trim().min(1),
  services: z.array(z.string().trim().min(1)).min(1),
  details: z.string().trim().optional(),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;
