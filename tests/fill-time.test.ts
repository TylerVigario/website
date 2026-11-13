import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  checkStamp,
  issueStamp,
  keepOrIssue,
  MAX_AGE_MS,
  MIN_FILL_MS,
  SERVED_FIELD,
} from "@/lib/api/fill-time";

/**
 * Like the honeypot, the stamp has to be rendered by the forms AND read
 * on the server, or it is nothing. Here: that a stamp verifies only as
 * this server issued it, for the form it was issued for, between
 * MIN_FILL_MS and MAX_AGE_MS old. That a saved submission spends it is
 * proved against the real table in schema-table-agree.test.ts; what a
 * refusal does to a submission in submit.test.ts; and all of it against
 * the built server by check-forms.
 */
const KEY = Buffer.alloc(32, 7);
const OTHER_KEY = Buffer.alloc(32, 8);
const now = 1_800_000_000_000;
const servedAgo = (ago: number, form: "quote" | "pots-audit" = "quote") =>
  issueStamp(form, KEY, now - ago);

/** The stamp with one of its three parts replaced. */
const withPart = (stamp: string, index: number, part: string) => {
  const parts = stamp.split(".");
  parts[index] = part;
  return parts.join(".");
};

describe("a stamp", () => {
  it("verifies from the floor on, and gives the value its row spends", () => {
    const stamp = servedAgo(MIN_FILL_MS);
    expect(checkStamp("quote", stamp, KEY, now)).toEqual({
      kind: "ok",
      nonce: stamp.split(".")[1],
    });
    expect(checkStamp("quote", servedAgo(60 * 60 * 1000), KEY, now).kind).toBe("ok");
  });

  it("is too soon below the floor, and says how soon", () => {
    expect(checkStamp("quote", servedAgo(400), KEY, now)).toEqual({
      kind: "too-soon",
      elapsed: 400,
    });
    expect(checkStamp("quote", servedAgo(MIN_FILL_MS - 1), KEY, now)).toEqual({
      kind: "too-soon",
      elapsed: MIN_FILL_MS - 1,
    });
  });

  it("is too soon from the future, where only this server's clock could have put it", () => {
    expect(checkStamp("quote", servedAgo(-5000), KEY, now).kind).toBe("too-soon");
  });

  it("is stale past its age, which is how long a draft is kept", () => {
    expect(checkStamp("quote", servedAgo(MAX_AGE_MS), KEY, now).kind).toBe("ok");
    expect(checkStamp("quote", servedAgo(MAX_AGE_MS + 1), KEY, now)).toEqual({
      kind: "stale",
      why: "with a stamp older than its form's limit",
    });
  });

  it("is stale when it is missing", () => {
    for (const missing of [undefined, ""]) {
      expect(checkStamp("quote", missing, KEY, now)).toEqual({
        kind: "stale",
        why: "with no stamp",
      });
    }
  });

  it("does not verify once any part of it is changed", () => {
    const stamp = servedAgo(10_000);
    const [time = "", nonce = "", mac = ""] = stamp.split(".");
    const forged = [
      // Backdated: the change a script would make to skip the floor.
      withPart(stamp, 0, String(Number(time) - 60_000)),
      withPart(stamp, 1, `${nonce.slice(0, -1)}${nonce.endsWith("A") ? "B" : "A"}`),
      withPart(stamp, 2, `${mac.slice(0, -1)}${mac.endsWith("A") ? "B" : "A"}`),
      // A stamp made up from scratch, in the right shape.
      issueStamp("quote", OTHER_KEY, now - 10_000),
    ];
    for (const stamp of forged) {
      expect(checkStamp("quote", stamp, KEY, now)).toEqual({
        kind: "stale",
        why: "with a stamp that does not verify",
      });
    }
  });

  it("does not verify on the other form", () => {
    expect(checkStamp("pots-audit", servedAgo(10_000, "quote"), KEY, now).kind).toBe("stale");
    expect(checkStamp("quote", servedAgo(10_000, "pots-audit"), KEY, now).kind).toBe("stale");
  });

  it("does not verify in any other shape", () => {
    // The old unsigned stamp among them: a page served before stamps were
    // signed is refused once, and the form that comes back is stamped.
    for (const bad of ["soon", "1.5e12", String(now - 10_000), ["x"], 42, null, {}]) {
      expect(checkStamp("quote", bad, KEY, now).kind).toBe("stale");
    }
  });

  it("is different every time, even issued in the same millisecond", () => {
    expect(issueStamp("quote", KEY, now)).not.toBe(issueStamp("quote", KEY, now));
  });
});

describe("the stamp a form renders", () => {
  it("is new, for a form served fresh", () => {
    const stamp = keepOrIssue("quote", {}, KEY, now);
    expect(checkStamp("quote", stamp, KEY, now + MIN_FILL_MS).kind).toBe("ok");
    expect(stamp.startsWith(`${now}.`)).toBe(true);
  });

  it("is the one it was sent with, when the form comes back after a failed send", () => {
    // Otherwise fixing one field and sending again would count from now.
    const early = servedAgo(1000);
    const settled = servedAgo(60_000);
    expect(keepOrIssue("quote", { [SERVED_FIELD]: early }, KEY, now)).toBe(early);
    expect(keepOrIssue("quote", { [SERVED_FIELD]: settled }, KEY, now)).toBe(settled);
  });

  it("is new, when what came back is not a stamp this server issued for this form, now", () => {
    for (const sent of [
      "soon",
      String(now - 1000),
      servedAgo(-5000),
      servedAgo(MAX_AGE_MS + 1),
      servedAgo(1000, "pots-audit"),
      issueStamp("quote", OTHER_KEY, now - 1000),
    ]) {
      const stamp = keepOrIssue("quote", { [SERVED_FIELD]: sent }, KEY, now);
      expect(stamp).not.toBe(sent);
      expect(stamp.startsWith(`${now}.`)).toBe(true);
    }
  });

  it("is rendered by both forms, for their own form, under the name the server reads", () => {
    for (const [file, form] of [
      ["src/components/QuoteForm.astro", "quote"],
      ["src/components/PotsAuditForm.astro", "pots-audit"],
    ] as const) {
      const markup = readFileSync(file, "utf8");
      expect(markup).toContain(
        `<input type="hidden" name="${SERVED_FIELD}" value={servedStamp("${form}", values)} />`,
      );
    }
  });
});
