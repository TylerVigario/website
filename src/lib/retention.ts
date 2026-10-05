/**
 * How long things are kept. The privacy page states these numbers and the
 * code that enforces them imports them from here, so the two cannot
 * disagree.
 */

/** A submission, deleted by src/lib/db.ts. */
export const RETENTION_MONTHS = 24;

/** A form draft in the visitor's own browser, left untouched: discarded
 *  by src/lib/forms/enhance.ts the next time that form opens. */
export const DRAFT_DAYS = 30;
