import * as z from "zod/mini";

// Shared shape for /api/quote — used by the route handler to validate
// the inbound POST body and by ContactForm to construct it. Trims are
// part of the schema so the route doesn't need to re-trim. Messages
// are user-facing: they surface inline next to inputs (via the
// zodResolver client-side) and inside Problem Details errors[]
// when the server rejects (via zodError() → setError()).
export const QuoteRequest = z.object({
  name: z.string().check(z.trim(), z.minLength(1, "Please enter your name.")),
  contact: z.string().check(z.trim(), z.minLength(1, "Please enter a phone number or email.")),
  services: z
    .array(z.string().check(z.trim(), z.minLength(1)))
    .check(z.minLength(1, "Pick at least one service.")),
  details: z.optional(z.string().check(z.trim())),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;
