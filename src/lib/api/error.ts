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

/** One field-level validation issue, as it appears in `errors[]`. */
interface FieldError {
  field: string;
  message: string;
}

/**
 * The response shape, declared once.
 *
 * A plain type rather than a zod schema: nothing validates a Problem
 * Details response at runtime. The server constructs it — annotating the
 * body below is what makes a drift a compile error — and the client
 * reads it by hand, deliberately, to keep zod out of a browser bundle
 * that is otherwise about 2 KB. A schema whose only use is being
 * `z.infer`'d is a runtime object earning nothing.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: FieldError[];
}

/** A failed safe-parse, typed by what this function actually reads
 *  rather than by which zod build produced it. The request schemas are
 *  zod/mini and this module now imports no zod at all; `issues` is the
 *  only thing needed here and its shape is the same across builds.
 *  Structural typing keeps this module free of the dependency entirely. */
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

  // Typed, not merely shaped like it: the schema below is the single
  // declaration of this contract, and annotating the body here makes a
  // drift between the two a compile error rather than a surprise for
  // whoever is parsing the response.
  const body: ProblemDetails = {
    type: "/errors/validation",
    title: "Validation Error",
    status: 400,
    detail: errors[0]?.message,
    errors,
  };

  return new Response(JSON.stringify(body), {
    status: 400,
    // RFC 9457 media type, not application/json — the shape is
    // Problem Details and the content type should say so.
    headers: { "Content-Type": "application/problem+json" },
  });
}
