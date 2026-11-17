import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  checkStamp,
  issueStamp,
  keepOrIssue,
  MIN_FILL_MS,
  SERVED_FIELD,
} from "@/lib/api/fill-time";

/**
 * Like the honeypot, the stamp has to be rendered by the forms AND read
 * on the server, or it is nothing. Here: that a stamp verifies only as
 * this server issued it, and from MIN_FILL_MS old on, at any age. What a
 * refusal does to a submission, and that a stamp sent again saves again,
 * are proved in submit.test.ts, and all of it against the built server by
 * check-forms.
 */
const KEY = Buffer.alloc(32, 7);
const OTHER_KEY = Buffer.alloc(32, 8);
const now = 1_800_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const servedAgo = (ago: number) => issueStamp(KEY, now - ago);

describe("a stamp", () => {
  it("verifies from the floor on", () => {
    expect(checkStamp(servedAgo(MIN_FILL_MS), KEY, now)).toEqual({ kind: "ok" });
    expect(checkStamp(servedAgo(60 * 60 * 1000), KEY, now)).toEqual({ kind: "ok" });
  });

  it("does not expire: a page left open for a year still sends", () => {
    expect(checkStamp(servedAgo(365 * DAY_MS), KEY, now)).toEqual({ kind: "ok" });
  });

  it("is too soon below the floor, and says how soon", () => {
    expect(checkStamp(servedAgo(400), KEY, now)).toEqual({ kind: "too-soon", elapsed: 400 });
    expect(checkStamp(servedAgo(MIN_FILL_MS - 1), KEY, now)).toEqual({
      kind: "too-soon",
      elapsed: MIN_FILL_MS - 1,
    });
  });

  it("is too soon from the future, where only this server's clock could have put it", () => {
    expect(checkStamp(servedAgo(-5000), KEY, now).kind).toBe("too-soon");
  });

  it("is stale when it is missing", () => {
    for (const missing of [undefined, ""]) {
      expect(checkStamp(missing, KEY, now)).toEqual({ kind: "stale", why: "with no stamp" });
    }
  });

  it("does not verify once either part of it is changed", () => {
    const stamp = servedAgo(10_000);
    const [time = "", mac = ""] = stamp.split(".");
    const forged = [
      // Backdated: the change a script would make to skip the floor.
      `${Number(time) - 60_000}.${mac}`,
      `${time}.${mac.slice(0, -1)}${mac.endsWith("A") ? "B" : "A"}`,
      // A stamp made up from scratch, in the right shape.
      issueStamp(OTHER_KEY, now - 10_000),
    ];
    for (const stamp of forged) {
      expect(checkStamp(stamp, KEY, now)).toEqual({
        kind: "stale",
        why: "with a stamp that does not verify",
      });
    }
  });

  it("does not verify in any other shape", () => {
    // The old unsigned stamp among them: a page served before stamps were
    // signed is refused once, and the form that comes back is stamped.
    for (const bad of ["soon", "1.5e12", String(now - 10_000), ["x"], 42, null, {}]) {
      expect(checkStamp(bad, KEY, now).kind).toBe("stale");
    }
  });
});

describe("the stamp a form renders", () => {
  it("is new, for a form served fresh", () => {
    const stamp = keepOrIssue({}, KEY, now);
    expect(checkStamp(stamp, KEY, now + MIN_FILL_MS).kind).toBe("ok");
    expect(stamp.startsWith(`${now}.`)).toBe(true);
  });

  it("is the one it was sent with, when the form comes back after a failed send", () => {
    // Otherwise fixing one field and sending again would count from now.
    const early = servedAgo(1000);
    const settled = servedAgo(60_000);
    expect(keepOrIssue({ [SERVED_FIELD]: early }, KEY, now)).toBe(early);
    expect(keepOrIssue({ [SERVED_FIELD]: settled }, KEY, now)).toBe(settled);
  });

  it("is new, when what came back is not a stamp this server issued, by now", () => {
    for (const sent of [
      "soon",
      String(now - 1000),
      servedAgo(-5000),
      issueStamp(OTHER_KEY, now - 1000),
    ]) {
      const stamp = keepOrIssue({ [SERVED_FIELD]: sent }, KEY, now);
      expect(stamp).not.toBe(sent);
      expect(stamp.startsWith(`${now}.`)).toBe(true);
    }
  });

  it("is rendered by both forms, under the name the server reads", () => {
    for (const file of ["src/components/QuoteForm.astro", "src/components/PotsAuditForm.astro"]) {
      expect(readFileSync(file, "utf8")).toContain(
        `<input type="hidden" name="${SERVED_FIELD}" value={servedStamp(values)} />`,
      );
    }
  });
});
