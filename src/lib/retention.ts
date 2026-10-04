/**
 * How long a submission is kept. The privacy page states this number and
 * src/lib/db.ts enforces it; both import it from here so they cannot
 * disagree.
 */
export const RETENTION_MONTHS = 24;
