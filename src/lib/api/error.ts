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
 * Client: src/lib/forms/enhance.ts reads this shape by hand rather than
 *   importing it, so zod stays out of the browser, and matches `errors[]`
 *   back to the form's fields.
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

  // Typed, not merely shaped like it: the ProblemDetails interface above is the single
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

/** 405, with the `Allow` header RFC 9110 requires on one.
 *
 *  Without a handler for the other methods, Astro has no route for them
 *  and answers 404 with an HTML error page — telling a client the
 *  endpoint does not exist when it does, in a media type an API consumer
 *  did not ask for. The distinction matters to anything deciding whether
 *  to retry, and `enhance.ts` parses every failure as Problem Details, so
 *  an HTML body degrades a specific message into a generic one.
 */
export function methodNotAllowed(allowed: readonly string[]): Response {
  const allow = allowed.join(", ");
  const body: ProblemDetails = {
    type: "/errors/method-not-allowed",
    title: "Method Not Allowed",
    status: 405,
    detail: `This endpoint accepts ${allow}.`,
  };
  return new Response(JSON.stringify(body), {
    status: 405,
    headers: { "Content-Type": "application/problem+json", Allow: allow },
  });
}

/** TWO ERRORS UNDER /api/ ARE NOT THIS SHAPE, AND CANNOT BE.
 *
 *  A cross-site write is rejected by Astro before any middleware or
 *  route runs — `403 text/plain`, "Cross-site POST form submissions are
 *  forbidden". Measured: middleware executes for 200 and 405 and never
 *  for that 403. Controlling its shape would mean turning off
 *  `checkOrigin` and reimplementing the check, trading a working
 *  security boundary for a media type.
 *
 *  An unhandled fault in a route returns the site's `500 text/html`.
 *  Catching that to reshape it is the blanket try/catch the guardrails
 *  forbid, and it would drop the stack the adapter logs.
 *
 *  Neither costs the one consumer anything: enhance.ts parses failures
 *  with `res.json().catch(() => null)` and falls back to a root message,
 *  so an unparseable body degrades the wording rather than the handling.
 *
 *  404 for a path under /api/ that no route claims.
 *
 *  The namespace answers in one media type. A client that asked for JSON
 *  and got an HTML 404 has to guess whether it reached the API at all. */
export function notFound(): Response {
  const body: ProblemDetails = {
    type: "/errors/not-found",
    title: "Not Found",
    status: 404,
    detail: "No endpoint at this path.",
  };
  return new Response(JSON.stringify(body), {
    status: 404,
    headers: { "Content-Type": "application/problem+json" },
  });
}
