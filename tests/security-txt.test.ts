import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GET } from "../src/pages/.well-known/security.txt";

/**
 * RFC 9116 makes two fields mandatory and says a consumer should not
 * trust the file without them. A security contact that is malformed,
 * expired, or points somewhere nobody reads is worse than none: it
 * absorbs a report and loses it.
 *
 * The drift this guards is the one that actually happens — SECURITY.md
 * and security.txt naming different addresses, so which one a
 * researcher used decides whether the report arrives.
 */
const render = async (): Promise<string> => {
  const res = await (GET as (ctx: { site: URL }) => Response | Promise<Response>)({
    site: new URL("https://vigario.tech"),
  });
  return res.text();
};

const field = (body: string, name: string): string[] =>
  body
    .split("\n")
    .filter((l) => l.startsWith(`${name}:`))
    .map((l) => l.slice(name.length + 1).trim());

describe("security.txt", () => {
  it("carries the fields RFC 9116 requires", async () => {
    const body = await render();
    expect(field(body, "Contact").length).toBeGreaterThan(0);
    expect(field(body, "Expires")).toHaveLength(1);
  });

  it("does not ship already expired", async () => {
    const [expires] = field(await render(), "Expires");
    const when = new Date(expires);
    expect(Number.isNaN(when.getTime())).toBe(false);
    expect(when.getTime()).toBeGreaterThan(Date.now());
  });

  it("is served as text/plain, which the RFC requires", async () => {
    const res = await (GET as (ctx: { site: URL }) => Response | Promise<Response>)({
      site: new URL("https://vigario.tech"),
    });
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
  });

  it("names the same address SECURITY.md tells people to use", async () => {
    const body = await render();
    const policy = readFileSync("SECURITY.md", "utf8");
    const emails = field(body, "Contact")
      .filter((c) => c.startsWith("mailto:"))
      .map((c) => c.slice("mailto:".length));
    expect(emails.length).toBeGreaterThan(0);
    for (const address of emails) expect(policy).toContain(address);
  });

  it("points Canonical at the site it is served from", async () => {
    const [canonical] = field(await render(), "Canonical");
    expect(canonical).toBe("https://vigario.tech/.well-known/security.txt");
  });
});
