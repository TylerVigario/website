/**
 * Client-side validation rules, written by hand.
 *
 * WHY NOT SHIP THE SCHEMA. zod is the authority and the server enforces
 * it, but putting it in the browser cost 34.5 KB gzipped even as
 * zod/mini — 45% of the contact page, more than the font, CSS, HTML and
 * logo combined. On a throttled connection that is three seconds spent
 * downloading the ability to say "please enter your name".
 *
 * So single-source-of-truth becomes VERIFIED rather than structural:
 * these rules must agree with the zod schemas, and
 * tests/form-rules.test.ts fails the build if they ever stop agreeing.
 * Drift is loud instead of silent, and the visitor pays ~1 KB.
 *
 * ON WHY THESE ARE LOOSE, WHICH IS NOT AN ARGUMENT AGAINST VALIDATION.
 * Validation is fine. What is not fine is a form whose fields do not
 * match what a person actually needs to say, which then rejects them
 * for improvising — an extension typed into a number-only box, a suite
 * number with nowhere to go. The fix for that is structure, not
 * leniency: if extensions matter, there is an extension field, and then
 * validating the number strictly is honest.
 *
 * These rules are loose because the fields genuinely are. `contact` asks
 * for "phone or email, whichever you'd rather I use" and means it, so
 * there is no format to enforce. That is the field being honest, not
 * the validator being lax. A field that accepts one shape should say so
 * and check it; a field that accepts anything should not pretend
 * otherwise.
 *
 * Either way a constraint is stated on the field before it can be
 * failed, never discovered by rejection.
 */

export type FieldValue = string | string[];
export type Rule = (value: FieldValue) => string | null;
export type Rules = Record<string, Rule>;

const filled = (message: string): Rule => {
  return (value) => (typeof value === "string" && value.trim().length > 0 ? null : message);
};

const chosen = (message: string): Rule => {
  return (value) => (Array.isArray(value) && value.length > 0 ? null : message);
};

/** Mirrors QuoteRequest. Messages are copied from the schema so the two
 *  read identically to a user; the test proves they stay that way. */
export const quoteRules: Rules = {
  name: filled("Please enter your name."),
  contact: filled("Please enter a phone number or email."),
  services: chosen("Pick at least one service."),
  details: () => null,
};

/** Mirrors PotsAuditRequest. */
export const potsAuditRules: Rules = {
  business: filled("Please enter the business name."),
  name: filled("Please enter your name."),
  contact: filled("Please enter a phone number or email."),
  bill: filled("Pick a range."),
  details: () => null,
};
