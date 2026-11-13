/**
 * RFC 9457 Problem Details error responses.
 *
 * Every API error returns:
 *   { type, title, status, detail?, errors? }
 *
 * `type` identifies the error class. A validation failure has its own,
 * a tag URI (RFC 4151) that names the class without pretending to be a
 * page: the relative "/errors/validation" this used to send resolved to a
 * 404 on this site, while RFC 9457 §3.1.1 expects a type that can be
 * dereferenced to lead to documentation. An error that means no more
 * than its HTTP status uses `about:blank`, the RFC's own type for that,
 * with the status phrase as its title (§4.2.1).
 *
 * `errors` is an optional array of field-level validation issues
 * (Zod failures), each with { field, message }.
 *
 * Server: route handlers return `zodError()` for validation failures.
 * Client: src/lib/forms/enhance.ts reads this shape by hand rather than
 *   importing it, so zod stays out of the browser, and matches `errors[]`
 *   back to the form's fields.
 */
import { API_MESSAGE, type Refusal } from "@/lib/api/fill-time";

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

/** The problem type of a validation failure. Stable: a client may switch on it. */
export const VALIDATION_TYPE = "tag:vigario.tech,2026:validation";

/** The problem type of a form sent faster than a person fills one in.
 *  Its own type rather than about:blank, because it means more than its
 *  status: nothing in the content was wrong, and sending it again later
 *  will succeed. Stable, like VALIDATION_TYPE. */
export const TOO_SOON_TYPE = "tag:vigario.tech,2026:too-soon";

/** The problem type of a form whose stamp is missing, does not verify, or
 *  has expired (fill-time.ts): the page has to be loaded again before it
 *  can be sent. Stable, like VALIDATION_TYPE. */
export const STALE_FORM_TYPE = "tag:vigario.tech,2026:stale-form";

/** The problem type of a form whose stamp a saved submission already
 *  spent: what it sent has arrived. Stable, like VALIDATION_TYPE. */
export const ALREADY_SENT_TYPE = "tag:vigario.tech,2026:already-sent";

/** A Problem Details response. */
function problem(body: ProblemDetails, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: body.status,
    // RFC 9457 media type, not application/json — the shape is
    // Problem Details and the content type should say so.
    headers: { "Content-Type": "application/problem+json", ...headers },
  });
}

/** Format a failed safe-parse into a Problem Details 422 with one entry
 *  per issue. The form maps these back to inline field errors.
 *
 *  422, not 400: the request was read and understood, and its content is
 *  what failed (RFC 9110 §15.5.21). The page that takes the no-JS submit
 *  answers the same failure with 422, and the two ways in should agree.
 *  400 is for a body that could not be read at all (badRequest below). */
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
    type: VALIDATION_TYPE,
    title: "Validation Error",
    status: 422,
    detail: errors[0]?.message,
    errors,
  };
  return problem(body);
}

/** Refused by its form's stamp (fill-time.ts). 422 for one sent within
 *  MIN_FILL_MS of being served or with a stale stamp, 409 for a stamp a
 *  saved submission already spent, which conflicts with what is stored;
 *  the page that takes the no-JS submit answers each the same, so the two
 *  ways in agree. No `errors`: no field is at fault, so the form shows
 *  `detail` at the top and every field keeps what was typed. */
export function stampRefused(reason: Refusal): Response {
  const kinds = {
    "too-soon": { type: TOO_SOON_TYPE, title: "Sent Too Soon" },
    stale: { type: STALE_FORM_TYPE, title: "Form Expired" },
    spent: { type: ALREADY_SENT_TYPE, title: "Already Sent" },
  } as const;
  return problem({ ...kinds[reason], status: REFUSED_STATUS[reason], detail: API_MESSAGE[reason] });
}

/** The status a stamp's refusal is answered with, on both ways in. */
export const REFUSED_STATUS: Record<Refusal, 409 | 422> = {
  "too-soon": 422,
  stale: 422,
  spent: 409,
};

/** 400 for a body that could not be read: malformed JSON, or a form body
 *  that does not parse. Before this, such a body reached the schema as
 *  null and came back as "Invalid input: expected object, received null". */
export function badRequest(): Response {
  return problem({
    type: "about:blank",
    title: "Bad Request",
    status: 400,
    detail: "The submission could not be read.",
  });
}

/** 413 for a body over BODY_LIMIT_BYTES, which the adapter refuses to
 *  read (RFC 9110 §15.5.14). */
export function contentTooLarge(): Response {
  return problem({
    type: "about:blank",
    title: "Content Too Large",
    status: 413,
    detail: "The submission is larger than this form accepts.",
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
  return problem(
    {
      type: "about:blank",
      title: "Method Not Allowed",
      status: 405,
      detail: `This endpoint accepts ${allow}.`,
    },
    { Allow: allow },
  );
}

/** FOUR ERRORS UNDER /api/ ARE NOT THIS SHAPE, AND CANNOT BE.
 *
 *  A cross-site write is rejected by Astro before any middleware or
 *  route runs — `403 text/plain`, "Cross-site POST form submissions are
 *  forbidden". Measured: middleware executes for 200 and 405 and never
 *  for that 403. Controlling its shape would mean turning off
 *  `checkOrigin` and reimplementing the check, trading a working
 *  security boundary for a media type.
 *
 *  A URL that is not valid percent-encoded UTF-8, in its path or its
 *  query (`/api/%C0%AF`, a bare `%`), is answered `400` "Bad request.",
 *  with no Content-Type, by the Node adapter's server, before it serves
 *  a file or hands the request to Astro. A path still encoded after ten
 *  decodes is answered by Astro with an empty `400`, before middleware
 *  or routing, so that nothing checks one path while a later decode
 *  routes another. Both are checks on the URL itself, made before any
 *  code here runs; answering them here would mean a server of our own in
 *  front of the adapter, decoding URLs for it.
 *
 *  An unhandled fault in a route returns the site's `500 text/html`.
 *  Catching that to reshape it is the blanket try/catch the guardrails
 *  forbid, and it would drop the stack the adapter logs.
 *
 *  None of them costs the one consumer anything: enhance.ts parses
 *  failures with `res.json().catch(() => null)` and falls back to a root
 *  message, so an unparseable body degrades the wording rather than the
 *  handling. And it posts to two fixed paths with no query, so neither
 *  400 can reach it. check:forms holds the 403 and both 400s to what is
 *  written here, so an update that changes one fails there.
 *
 *  Below all four, a request Node cannot parse, such as one whose headers
 *  pass 16 KB, is answered by Node itself (`431`, or `400`), with no body
 *  and whatever its path.
 *
 *  404 for a path under /api/ that no route claims.
 *
 *  The namespace answers in one media type. A client that asked for JSON
 *  and got an HTML 404 has to guess whether it reached the API at all. */
export function notFound(): Response {
  return problem({
    type: "about:blank",
    title: "Not Found",
    status: 404,
    detail: "No endpoint at this path.",
  });
}
