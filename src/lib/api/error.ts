/**
 * RFC 9457 Problem Details error responses.
 *
 * Every API error returns:
 *   { type, title, status, detail?, errors? }
 *
 * `type` is a relative URI identifying the error class — stable
 * identifiers that API consumers can switch on.
 *
 * `errors` is an optional array of field-level validation issues
 * (Zod failures), each with { field, message }.
 *
 * Server: route handlers return `zodError()` for validation failures.
 * Client: parse responses through `ProblemDetails` to type-check the
 *   shape and surface field-level errors back to the form.
 */

import { z } from "zod";

const FieldError = z.object({
  field: z.string(),
  message: z.string(),
});

export const ProblemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  errors: z.array(FieldError).optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetails>;

/** A failed safe-parse, typed by what this function actually reads
 *  rather than by which zod build produced it. The schemas are
 *  zod/mini and this module is full zod; their error classes differ,
 *  but `issues` is the only thing needed and it is the same shape in
 *  both. Structural typing here beats forcing one build on the other. */
export interface SafeParseFailure {
  error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
}

/** Format a failed safe-parse into a Problem Details 400 with one entry
 *  per issue. The form maps these back to inline field errors. */
export function zodError(result: SafeParseFailure): Response {
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));

  return new Response(
    JSON.stringify({
      type: "/errors/validation",
      title: "Validation Error",
      status: 400,
      detail: errors[0]?.message,
      errors,
    }),
    {
      status: 400,
      // RFC 9457 media type, not application/json — the shape is
      // Problem Details and the content type should say so.
      headers: { "Content-Type": "application/problem+json" },
    },
  );
}
