import * as z from "zod/mini";

/**
 * A single-line field's control characters, each run made one space.
 *
 * A browser strips line breaks from a single-line input before sending
 * it, so a name, business or contact carrying a control character came
 * from something other than a person typing at the form: a script, or a
 * pasted tab. Nothing downstream interprets one. The statements are
 * parameterized, the email escapes every field, and nodemailer folds a
 * line break in the subject into a space. But each would otherwise be
 * stored and emailed as sent, unseen.
 *
 * Replaced rather than refused: nobody can see the tab they pasted, and
 * refusing it would turn a real lead away over a character they cannot
 * find. It runs before the trim, so a field of nothing else comes out
 * empty and asks for a value, and lengths are measured after it. The
 * submitted text is still what the form echoes back on an error
 * (submit.ts), so this changes only what is kept and sent.
 *
 * Unicode's format characters are left alone: bidirectional marks and
 * joiners are part of how some names are written. `details` does not use
 * this; its line breaks are meant.
 */
export const oneLine = z.overwrite((value: string) =>
  value.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " "),
);
