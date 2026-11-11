/**
 * How many notification emails the site sends, at most.
 *
 * Every saved submission is announced by email, and nothing else bounds
 * how many arrive: one machine stored 412 a second against the built
 * server, each with its notification. The proxy limits submissions per
 * client address (the serving contract in CLAUDE.md), but a flood from
 * many addresses passes that, and the relay is where it costs. A personal
 * Gmail account sends 500 a day and a Workspace one 2,000; past that, the
 * account cannot send anything for up to a day, the operator's own mail
 * included.
 *
 * So the site sends at most NOTIFY_CAP notifications in any
 * NOTIFY_WINDOW_HOURS, counted from when the relay took each one
 * (`notified_at`), which a restart does not reset. Fifty is far above
 * any real day of leads and a tenth of the smallest quota. Past it a
 * submission is still saved, the same as any other, and is not emailed:
 * nothing is refused, so no lead is lost to the cap. One notice says the
 * notifications have paused, at most once a window, because a pause
 * nobody hears of is a lead nobody answers.
 */
export const NOTIFY_CAP = 50;
export const NOTIFY_WINDOW_HOURS = 24;
