import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  describeRelay,
  isLocalAddress,
  isLoopbackHost,
  readRelay,
  transportOptions,
  unverifiedPeerWarning,
  type Relay,
} from "@/lib/email/relay";

const relay = (over: Partial<Relay> = {}): Relay => ({
  host: "relay.example",
  port: 587,
  tls: "starttls",
  verify: true,
  timeoutMs: 10_000,
  auth: null,
  ...over,
});

describe("local addresses (the only thing the warning looks at)", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.5",
    "169.254.1.1",
    "::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:192.168.1.5",
  ])("%s is local", (a) => expect(isLocalAddress(a)).toBe(true));

  // The edges of each range, and the carrier's shared space, which is
  // not the operator's network.
  it.each([
    "172.15.255.255",
    "172.32.0.1",
    "192.169.0.1",
    "100.64.0.1",
    "8.8.8.8",
    "203.0.113.9",
    "2001:db8::1",
    "not-an-address",
  ])("%s is not", (a) => expect(isLocalAddress(a)).toBe(false));
});

describe("loopback (which only picks a default)", () => {
  it.each(["localhost", "LOCALHOST", "127.0.0.2", "::1", "::ffff:127.0.0.1"])("%s", (h) =>
    expect(isLoopbackHost(h)).toBe(true),
  );
  it.each(["localhost.example.com", "127.0.0.1.nip.io", "evil-localhost", "[::1]", ""])(
    "%s is not",
    (h) => expect(isLoopbackHost(h)).toBe(false),
  );
});

describe("defaults, when the operator says nothing", () => {
  it("requires STARTTLS on 587 for a remote relay", () => {
    expect(readRelay({}).relay).toMatchObject({
      host: "smtp.gmail.com",
      port: 587,
      tls: "starttls",
      verify: true,
    });
  });
  it("uses no TLS for a relay on this machine", () => {
    expect(readRelay({ SMTP_HOST: "localhost", SMTP_PORT: "25" }).relay?.tls).toBe("none");
  });
  it("uses implicit TLS on 465, whatever the host", () => {
    expect(readRelay({ SMTP_PORT: "465" }).relay?.tls).toBe("implicit");
    expect(readRelay({ SMTP_HOST: "localhost", SMTP_PORT: "465" }).relay?.tls).toBe("implicit");
  });
  it("picks the port from the mode", () => {
    expect(readRelay({ SMTP_TLS: "implicit" }).relay?.port).toBe(465);
  });
});

describe("explicit settings are honoured for any host", () => {
  it("plaintext to a remote relay", () => {
    const r = readRelay({ SMTP_HOST: "smtp.example.com", SMTP_TLS: "none" });
    expect(r.problems).toEqual([]);
    expect(r.relay?.tls).toBe("none");
  });
  it("plaintext to a LAN relay", () => {
    expect(readRelay({ SMTP_HOST: "192.168.1.20", SMTP_TLS: "none" }).relay?.tls).toBe("none");
  });
  it("STARTTLS on loopback", () => {
    expect(readRelay({ SMTP_HOST: "localhost", SMTP_TLS: "starttls" }).relay?.tls).toBe("starttls");
  });
  it("verification off", () => {
    expect(readRelay({ SMTP_TLS_VERIFY: "false" }).relay?.verify).toBe(false);
    expect(readRelay({ SMTP_TLS_VERIFY: "FALSE" }).relay?.verify).toBe(false);
  });
});

describe("values that cannot be acted on are reported, not guessed around", () => {
  it.each([
    [{ SMTP_USER: "a@example.com" }, "SMTP_PASS"],
    [{ SMTP_PASS: "secret" }, "SMTP_USER"],
    [{ SMTP_TLS: "tls" }, "SMTP_TLS"],
    [{ SMTP_TLS_VERIFY: "no" }, "SMTP_TLS_VERIFY"],
    [{ SMTP_PORT: "abc" }, "SMTP_PORT"],
    [{ SMTP_PORT: "70000" }, "SMTP_PORT"],
    [{ SMTP_TIMEOUT_MS: "0" }, "SMTP_TIMEOUT_MS"],
    [{ SMTP_TIMEOUT_MS: "1.5" }, "SMTP_TIMEOUT_MS"],
  ])("%j", (env, named) => {
    const r = readRelay(env);
    expect(r.relay).toBeNull();
    expect(r.problems.join(" ")).toContain(named);
  });
});

describe("the options handed to nodemailer", () => {
  it("implicit: TLS from the first byte", () => {
    const o = transportOptions(relay({ tls: "implicit", port: 465 }));
    expect(o).toMatchObject({ secure: true });
    expect(o).not.toHaveProperty("requireTLS");
    expect(o).not.toHaveProperty("ignoreTLS");
  });
  it("starttls: required, never opportunistic", () => {
    const o = transportOptions(relay({ tls: "starttls" }));
    expect(o).toMatchObject({ secure: false, requireTLS: true });
    expect(o).not.toHaveProperty("ignoreTLS");
  });
  it("none: plaintext", () => {
    const o = transportOptions(relay({ tls: "none" }));
    expect(o).toMatchObject({ secure: false, ignoreTLS: true });
    expect(o).not.toHaveProperty("requireTLS");
  });
  it("verification is off only when the operator turned it off", () => {
    expect(transportOptions(relay())).not.toHaveProperty("tls");
    expect(transportOptions(relay({ verify: false }))).toMatchObject({
      tls: { rejectUnauthorized: false },
    });
  });
  it("supplied credentials are always used", () => {
    const auth = { user: "a@example.com", pass: "secret" };
    expect(transportOptions(relay({ auth }))).toMatchObject({ auth, forceAuth: true });
    expect(transportOptions(relay())).not.toHaveProperty("forceAuth");
  });
  it("bounds every phase", () => {
    expect(transportOptions(relay({ timeoutMs: 1234 }))).toMatchObject({
      connectionTimeout: 1234,
      greetingTimeout: 1234,
      socketTimeout: 1234,
    });
  });
});

describe("the warning", () => {
  it("says nothing about an authenticated peer, wherever it is", () => {
    expect(unverifiedPeerWarning(relay(), ["8.8.8.8"])).toBeNull();
  });
  it("says nothing about an unauthenticated peer on the local network", () => {
    expect(unverifiedPeerWarning(relay({ tls: "none" }), ["192.168.1.20"])).toBeNull();
    expect(unverifiedPeerWarning(relay({ verify: false }), ["127.0.0.1", "fd00::5"])).toBeNull();
  });
  it("names the addresses outside it", () => {
    const w = unverifiedPeerWarning(relay({ tls: "none" }), ["192.168.1.20", "203.0.113.9"]);
    expect(w).toContain("203.0.113.9");
    expect(w).not.toContain("192.168.1.20");
    expect(w).toContain("plaintext");
  });
  it("says which choice it is about, and whether credentials ride along", () => {
    const auth = { user: "a@example.com", pass: "secret" };
    expect(unverifiedPeerWarning(relay({ verify: false, auth }), ["203.0.113.9"])).toMatch(
      /not verified.*credentials/,
    );
  });
});

it("the boot line states the mode", () => {
  expect(describeRelay(relay({ tls: "none" }))).toContain("plaintext");
  expect(describeRelay(relay({ verify: false }))).toContain("NOT verified");
  expect(describeRelay(relay({ auth: { user: "a@example.com", pass: "x" } }))).toContain(
    "authenticates as a@example.com",
  );
});

describe("certificate verification", () => {
  // Structural, like never-erase. Verification is off in exactly one
  // place, behind the operator's SMTP_TLS_VERIFY, and there are three
  // ways to switch it off: this option, a no-op identity check, and the
  // process-wide environment variable. None of them may appear anywhere
  // else.
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? sources(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
  const containing = (token: string) =>
    sources("src").filter((f) => readFileSync(f, "utf8").includes(token));

  it("is disabled only in relay.ts", () => {
    expect(containing("rejectUnauthorized")).toEqual([
      path.join("src", "lib", "email", "relay.ts"),
    ]);
  });
  it("is never disabled process-wide or by a no-op identity check", () => {
    expect(containing("NODE_TLS_REJECT_UNAUTHORIZED")).toEqual([]);
    expect(containing("checkServerIdentity")).toEqual([]);
  });
});
