import { afterEach, describe, expect, it, vi } from "vitest";
import { readRelay, transportOptions } from "@/lib/email/relay";

/**
 * relay.test.ts proves the policy. This proves mailer.ts applies it: the
 * real module, loaded under each environment, with nodemailer and DNS
 * replaced by recorders. A policy that is tested but not wired in is the
 * failure this file exists for.
 */
const { createTransport, lookup, sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("node:dns/promises", () => ({ lookup }));

const KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "NOTIFY_EMAIL",
  "SMTP_TLS",
  "SMTP_TLS_VERIFY",
  "SMTP_TIMEOUT_MS",
];

async function load(env: Record<string, string>, resolves: string[] = []) {
  vi.resetModules();
  sendMail.mockReset().mockResolvedValue({ messageId: "<id@relay>" });
  createTransport.mockReset().mockReturnValue({ sendMail });
  lookup.mockReset().mockResolvedValue(resolves.map((address) => ({ address, family: 4 })));
  for (const k of KEYS) vi.stubEnv(k, env[k] ?? "");
  const log = {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
  };
  const mod = await import("@/lib/email/mailer");
  return Object.assign(log, { mod });
}

const LOCAL_RELAY = {
  SMTP_HOST: "localhost",
  SMTP_PORT: "25",
  SMTP_FROM: "noreply@example.com",
  NOTIFY_EMAIL: "leads@example.com",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("mailer.ts builds the transport the relay describes", () => {
  it("builds nothing when nothing is set", async () => {
    const log = await load({});
    expect(createTransport).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it.each([
    ["an authenticated relay", { SMTP_USER: "a@example.com", SMTP_PASS: "secret" }],
    ["a local relay", LOCAL_RELAY],
    ["plaintext to a LAN relay", { ...LOCAL_RELAY, SMTP_HOST: "192.168.1.20", SMTP_TLS: "none" }],
    [
      "implicit TLS, unverified",
      { ...LOCAL_RELAY, SMTP_HOST: "10.0.0.5", SMTP_TLS: "implicit", SMTP_TLS_VERIFY: "false" },
    ],
  ])("%s", async (_label, env) => {
    await load(env);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(transportOptions(readRelay(env).relay!));
  });

  it("states the mode at boot", async () => {
    const log = await load(LOCAL_RELAY);
    expect(log.log).toHaveBeenCalledWith(expect.stringContaining("no TLS (plaintext)"));
  });
});

describe("the operator's choice stands, and is only commented on off the LAN", () => {
  it("says nothing for plaintext to a LAN address", async () => {
    const log = await load({ ...LOCAL_RELAY, SMTP_HOST: "relay.lan", SMTP_TLS: "none" }, [
      "192.168.1.20",
    ]);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledWith("relay.lan", { all: true }));
    await new Promise((r) => setImmediate(r));
    expect(log.warn).not.toHaveBeenCalled();
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("warns, and still sends, for plaintext to a public address", async () => {
    const log = await load({ ...LOCAL_RELAY, SMTP_HOST: "relay.example", SMTP_TLS: "none" }, [
      "203.0.113.9",
    ]);
    await vi.waitFor(() =>
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("203.0.113.9")),
    );
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("does not look anything up for an authenticated peer", async () => {
    await load({ SMTP_USER: "a@example.com", SMTP_PASS: "secret" });
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("what cannot be acted on is off, loudly", () => {
  it.each([
    [
      "half a pair of credentials",
      { SMTP_HOST: "relay.example", SMTP_USER: "a@example.com" },
      "SMTP_PASS",
    ],
    ["an unknown TLS mode", { ...LOCAL_RELAY, SMTP_TLS: "ssl" }, "SMTP_TLS"],
    ["no recipient or sender", { SMTP_HOST: "localhost" }, "no recipient"],
  ])("%s", async (_label, env, named) => {
    const log = await load(env);
    expect(createTransport).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`MISCONFIGURED.*${named}`)),
    );
  });
});

describe("a notification", () => {
  const QUOTE = { name: "Dana", contact: "dana@example.com", services: ["Linux"], details: "" };

  it("names the row in its subject, and answers Reply-To with the sender's address", async () => {
    const { mod } = await load(LOCAL_RELAY);
    expect(mod.mailState).toBe("on");
    expect(await mod.sendQuoteNotification(7, QUOTE)).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "New Quote Request #7 from Dana",
        replyTo: "dana@example.com",
      }),
    );
  });

  it.each([
    ["a phone number", "559 555 0100"],
    ["two addresses", "a@example.com, b@example.com"],
    ["an address with words around it", "email me at a@example.com"],
  ])("sets no Reply-To for %s", async (_label, contact) => {
    const { mod } = await load(LOCAL_RELAY);
    await mod.sendPotsAuditNotification(8, {
      business: "Acme",
      name: "Dana",
      contact,
      bill: "$100–$300",
    });
    const sent = sendMail.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.subject).toBe("POTS Audit Request #8 from Acme");
    expect(sent).not.toHaveProperty("replyTo");
  });

  it("is rethrown on a relay failure, logged by row id rather than by name", async () => {
    const { mod, error } = await load(LOCAL_RELAY);
    sendMail.mockRejectedValueOnce(new Error("relay down"));
    await expect(mod.sendQuoteNotification(9, QUOTE)).rejects.toThrow("relay down");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("#9"), expect.any(Error));
    expect(JSON.stringify(error.mock.calls)).not.toContain("Dana");
  });

  it.each([
    ["off", {}],
    ["misconfigured", { SMTP_HOST: "localhost" }],
  ])("is not sent, and says so, when mail is %s", async (state, env) => {
    const { mod } = await load(env);
    expect(mod.mailState).toBe(state);
    expect(await mod.sendQuoteNotification(10, QUOTE)).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("logs nothing a person typed when mail is off in production", async () => {
    vi.stubEnv("PROD", true);
    const { mod, log } = await load({});
    await mod.sendQuoteNotification(11, { ...QUOTE, details: "my alarm code is 1234" });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("#11");
    for (const typed of ["Dana", "dana@example.com", "1234"]) expect(logged).not.toContain(typed);
  });
});
