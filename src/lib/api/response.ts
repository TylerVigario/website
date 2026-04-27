import { z } from "zod";

// Shape of error responses from /api/*. Every non-2xx response from our
// route handlers returns this; clients parse it through ApiError.parse
// to get a typed error message instead of trusting an `any` blob.
export const ApiError = z.object({
  error: z.string(),
});
export type ApiError = z.infer<typeof ApiError>;

// 2xx responses from /api/*. Currently every endpoint just signals
// success — no per-endpoint payload. If that changes, give the endpoint
// its own response schema next to its request schema.
export const ApiSuccess = z.object({
  success: z.literal(true),
});
export type ApiSuccess = z.infer<typeof ApiSuccess>;
