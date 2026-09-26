/**
 * How long each free-text field may be, shared by the zod schemas (the
 * server's authority) and the browser rules (which must agree with them).
 * Imported by both, so the numbers exist once; the messages are compared
 * by tests/form-rules.test.ts like every other message.
 *
 * Generous on purpose. They exist to stop a single request storing tens of
 * megabytes, not to make anyone trim what they meant to say, and a field
 * over its limit gets a message, never a silent cut: there is no maxlength
 * attribute, because a browser enforcing one truncates a paste without a
 * word, which is losing what someone typed.
 */
export const MAX = {
  name: 100,
  business: 150,
  // The longest valid email address (RFC 5321's path limit); a phone
  // number, the other thing this field takes, is far shorter.
  contact: 254,
  bill: 100,
  details: 20_000,
} as const;

/** The one message for every limit, so client and server say it alike. */
export const tooLong = (max: number) =>
  `Please keep this to ${max.toLocaleString("en-US")} characters or fewer.`;
