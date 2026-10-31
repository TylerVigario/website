import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  canonicalIp,
  describeListing,
  listed,
  listsProblem,
  STALE_AFTER_DAYS,
} from "@/lib/api/spam-list";

/**
 * The spam lists flag a sender and never refuse one, so what has to hold
 * is that the lookup finds what is listed however it is written, finds
 * nothing it should not, and never throws: it runs inside the sender of a
 * notification for a row that is already stored. Real files in a real
 * directory, the way the host leaves them.
 */
let dir: string;
/** Each write gets its own modification time, as a host's rewrite a day
 *  later would: two in the same millisecond would look like one file. */
let writes = 0;
const write = (file: string, lines: string[], ageDays = 0) => {
  const at = path.join(dir, file);
  writeFileSync(at, lines.join("\n") + "\n");
  const t = new Date(Date.now() - ageDays * 86_400_000 + ++writes);
  utimesSync(at, t, t);
};

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "vts-spam-lists-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const fresh = () => {
  vi.stubEnv("SPAM_LISTS_DIR", dir);
  write("emails.txt", ["sales@spam.example", "Hello@Leads.Example "]);
  write("domains.txt", ["Bulk.Example"]);
  write("domain-fragments.txt", ["adshop.example"]);
  write("ips.txt", ["203.0.113.7", "2001:DB8:0:0:0:0:0:1", "not an address"]);
};

describe("an address", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    [" 203.0.113.7 ", "203.0.113.7"],
    ["::ffff:203.0.113.7", "203.0.113.7"],
    ["2001:DB8:0:0:0:0:0:1", "2001:db8::1"],
    ["2001:db8::1", "2001:db8::1"],
  ])("%j is written as %j", (raw, want) => {
    expect(canonicalIp(raw)).toBe(want);
  });

  it.each(["", "not an address", "203.0.113", "::ffff:999.0.0.1", "unknown"])(
    "%j is no address",
    (raw) => {
      expect(canonicalIp(raw)).toBeUndefined();
    },
  );
});

describe("a sender", () => {
  it("is found by email, whatever its case or spacing", () => {
    fresh();
    expect(listed("sales@spam.example", undefined)).toEqual(["email"]);
    expect(listed("  SALES@spam.EXAMPLE ", undefined)).toEqual(["email"]);
    expect(listed("hello@leads.example", undefined)).toEqual(["email"]);
  });

  it("is found by its email's domain, listed whole or by a fragment of it", () => {
    fresh();
    expect(listed("anyone@bulk.example", undefined)).toEqual(["email domain"]);
    expect(listed(" Anyone@BULK.example", undefined)).toEqual(["email domain"]);
    // A domain listed whole is not its subdomains; a fragment is anywhere.
    expect(listed("anyone@mail.bulk.example", undefined)).toEqual([]);
    expect(listed("boyle@boyle.adshop.example", undefined)).toEqual(["email domain"]);
    // Only the domain: a fragment in the name before the @ is no match.
    expect(listed("adshop.example@clean.example", undefined)).toEqual([]);
  });

  it("is found by IP address, however either side writes it", () => {
    fresh();
    expect(listed("559 555 0100", "203.0.113.7")).toEqual(["IP address"]);
    expect(listed("559 555 0100", "::ffff:203.0.113.7")).toEqual(["IP address"]);
    expect(listed("559 555 0100", "2001:db8::1")).toEqual(["IP address"]);
  });

  it("is found by both, and the notification says so in words", () => {
    fresh();
    const found = listed("sales@spam.example", "203.0.113.7");
    expect(found).toEqual(["email", "IP address"]);
    expect(describeListing(found)).toBe(
      "Its email and IP address are on a list of known spam senders.",
    );
    expect(describeListing(["email"])).toBe("Its email is on a list of known spam senders.");
    expect(describeListing(["email", "email domain", "IP address"])).toBe(
      "Its email, email domain, and IP address are on a list of known spam senders.",
    );
  });

  it("is not found when nothing it sent is listed", () => {
    fresh();
    expect(listed("dana@example.com", "198.51.100.1")).toEqual([]);
    expect(listed("559 555 0100", undefined)).toEqual([]);
    // A phone number is never looked up as an email.
    write("emails.txt", ["559 555 0100"]);
    expect(listed("559 555 0100", undefined)).toEqual([]);
  });

  it("is not looked up at all when no lists are configured", () => {
    vi.stubEnv("SPAM_LISTS_DIR", "");
    expect(listed("sales@spam.example", "203.0.113.7")).toEqual([]);
  });

  it("is found in a list the host has just replaced, without a restart", () => {
    fresh();
    expect(listed("new@spam.example", undefined)).toEqual([]);
    write("emails.txt", ["new@spam.example"]);
    expect(listed("new@spam.example", undefined)).toEqual(["email"]);
  });

  it("is let through unflagged, without throwing, when a list cannot be read", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("SPAM_LISTS_DIR", path.join(dir, "nowhere"));
    expect(listed("sales@spam.example", "203.0.113.7")).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(4);
    // The warning names the file, never what was looked up.
    const logged = JSON.stringify(warn.mock.calls.map((c) => String(c[0])));
    expect(logged).toContain("emails.txt");
    expect(logged).not.toContain("sales@spam.example");
    expect(logged).not.toContain("203.0.113.7");
  });
});

describe("the lists' health", () => {
  it("is fine when they are fresh, or deliberately absent", () => {
    fresh();
    expect(listsProblem()).toBeUndefined();
    vi.stubEnv("SPAM_LISTS_DIR", "");
    expect(listsProblem()).toBeUndefined();
  });

  it("names a missing list", () => {
    vi.stubEnv("SPAM_LISTS_DIR", path.join(dir, "nowhere"));
    expect(listsProblem()).toBe("emails.txt is missing from SPAM_LISTS_DIR");
  });

  it(`calls a list stale after ${STALE_AFTER_DAYS} days without a refresh`, () => {
    fresh();
    write("ips.txt", ["203.0.113.7"], STALE_AFTER_DAYS - 0.5);
    expect(listsProblem()).toBeUndefined();
    write("ips.txt", ["203.0.113.7"], STALE_AFTER_DAYS + 0.5);
    expect(listsProblem()).toMatch(/^ips\.txt was last refreshed 3\.5 days ago/);
  });
});
