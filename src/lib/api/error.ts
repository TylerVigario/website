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

import { NextResponse } from "next/server";
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

/** Format a Zod safe-parse failure into a Problem Details 400 with
 *  one entry per issue. The form maps these back to inline field
 *  errors via RHF's `setError`. */
export function zodError(result: z.ZodSafeParseError<unknown>): NextResponse<ProblemDetails> {
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));

  return NextResponse.json(
    {
      type: "/errors/validation",
      title: "Validation Error",
      status: 400,
      detail: errors[0]?.message,
      errors,
    },
    { status: 400 },
  );
}
