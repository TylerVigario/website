import { BlockList, isIP } from "node:net";

// How the notification relay is reached. The operator's settings, read
// from SMTP_*, decide everything here; the defaults are what applies
// when nothing is said, and nothing the operator says explicitly is
// refused. What the app adds is visibility: it states the mode it is
// using at boot, and warns — only warns — when the operator has chosen
// an unauthenticated peer somewhere outside the local network.
//
//   SMTP_TLS          implicit | starttls | none
//   SMTP_TLS_VERIFY   true | false          (default true)
//   SMTP_TIMEOUT_MS   per phase             (default 10000)
//
// `starttls` means REQUIRED. Opportunistic STARTTLS — nodemailer's own
// default — upgrades only when the server advertises it, so a relay that
// stops offering it, or anyone who strips the offer from the greeting,
// receives the message and any credentials in plaintext. An operator who
// wants plaintext says `none`, and gets it knowingly.

export type TlsMode = "implicit" | "starttls" | "none";

export interface Relay {
  host: string;
  port: number;
  tls: TlsMode;
  verify: boolean;
  timeoutMs: number;
  auth: { user: string; pass: string } | null;
}

type Env = Record<string, string | undefined>;

const DEFAULT_TIMEOUT_MS = 10_000;

// IANA special-purpose ranges that do not leave the site: loopback
// (RFC 1122, RFC 4291), private (RFC 1918), unique local (RFC 4193) and
// link-local (RFC 3927, RFC 4291). Shared address space (100.64.0.0/10,
// RFC 6598) is deliberately absent: it is the carrier's network, not the
// operator's. IPv4-mapped IPv6 addresses are checked as IPv4.
const LOCAL = new BlockList();
LOCAL.addSubnet("127.0.0.0", 8, "ipv4");
LOCAL.addSubnet("10.0.0.0", 8, "ipv4");
LOCAL.addSubnet("172.16.0.0", 12, "ipv4");
LOCAL.addSubnet("192.168.0.0", 16, "ipv4");
LOCAL.addSubnet("169.254.0.0", 16, "ipv4");
LOCAL.addAddress("::1", "ipv6");
LOCAL.addSubnet("fc00::", 7, "ipv6");
LOCAL.addSubnet("fe80::", 10, "ipv6");

const LOOPBACK = new BlockList();
LOOPBACK.addSubnet("127.0.0.0", 8, "ipv4");
LOOPBACK.addAddress("::1", "ipv6");

function inList(list: BlockList, address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  return list.check(address, family === 6 ? "ipv6" : "ipv4");
}

/** An address in a range that stays on the operator's own network. */
export function isLocalAddress(address: string): boolean {
  return inList(LOCAL, address);
}

/**
 * The name `localhost` (RFC 6761), or an address in 127.0.0.0/8 or ::1.
 * Used only to pick a default: a relay on the same machine defaults to no
 * TLS, because a local MTA's certificate is routinely self-signed or
 * stale and there is no network for it to protect.
 */
export function isLoopbackHost(host: string): boolean {
  return host.toLowerCase() === "localhost" || inList(LOOPBACK, host);
}

function parseMode(value: string): TlsMode | null {
  switch (value.toLowerCase()) {
    case "implicit":
    case "starttls":
    case "none":
      return value.toLowerCase() as TlsMode;
    default:
      return null;
  }
}

/**
 * Read the relay from the environment. Every value the operator sets is
 * honoured; one that cannot be acted on as written is a problem, reported
 * rather than guessed around, because a guess is a relay the operator did
 * not configure.
 */
export function readRelay(env: Env): { relay: Relay | null; problems: string[] } {
  const problems: string[] = [];
  const host = env.SMTP_HOST || "smtp.gmail.com";

  const user = env.SMTP_USER || "";
  const pass = env.SMTP_PASS || "";
  if (Boolean(user) !== Boolean(pass)) {
    problems.push(
      user ? "SMTP_USER is set but SMTP_PASS is not" : "SMTP_PASS is set but SMTP_USER is not",
    );
  }

  let port: number | null = null;
  if (env.SMTP_PORT) {
    port = Number(env.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      problems.push(`SMTP_PORT=${env.SMTP_PORT} is not a port`);
    }
  }

  let tls: TlsMode | null;
  if (env.SMTP_TLS) {
    tls = parseMode(env.SMTP_TLS);
    if (!tls) problems.push(`SMTP_TLS=${env.SMTP_TLS} is not one of implicit, starttls, none`);
  } else {
    tls = port === 465 ? "implicit" : isLoopbackHost(host) ? "none" : "starttls";
  }

  let verify = true;
  if (env.SMTP_TLS_VERIFY) {
    const v = env.SMTP_TLS_VERIFY.toLowerCase();
    if (v === "false") verify = false;
    else if (v !== "true")
      problems.push(`SMTP_TLS_VERIFY=${env.SMTP_TLS_VERIFY} is not true or false`);
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (env.SMTP_TIMEOUT_MS) {
    timeoutMs = Number(env.SMTP_TIMEOUT_MS);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      problems.push(
        `SMTP_TIMEOUT_MS=${env.SMTP_TIMEOUT_MS} is not a positive number of milliseconds`,
      );
    }
  }

  if (problems.length || !tls) return { relay: null, problems };
  return {
    relay: {
      host,
      port: port ?? (tls === "implicit" ? 465 : 587),
      tls,
      verify,
      timeoutMs,
      auth: user ? { user, pass } : null,
    },
    problems,
  };
}

/** The relay as nodemailer options. Nothing here overrides the relay. */
export function transportOptions(r: Relay) {
  return {
    host: r.host,
    port: r.port,
    secure: r.tls === "implicit",
    ...(r.tls === "starttls" ? { requireTLS: true } : {}),
    ...(r.tls === "none" ? { ignoreTLS: true } : {}),
    ...(r.verify ? {} : { tls: { rejectUnauthorized: false } }),
    // Per phase, not per send. nodemailer's own defaults are two minutes
    // to connect and ten of socket silence, and the send is awaited
    // before the form gets its answer.
    connectionTimeout: r.timeoutMs,
    greetingTimeout: r.timeoutMs,
    socketTimeout: r.timeoutMs,
    // Credentials the operator supplied are used, always. Without
    // forceAuth nodemailer skips AUTH when the server does not advertise
    // it, which on a plaintext connection is common, and the mail goes
    // out unauthenticated with nothing said.
    ...(r.auth ? { auth: r.auth, forceAuth: true } : {}),
  };
}

/** One line for the boot log: what the app is actually going to do. */
export function describeRelay(r: Relay): string {
  const tls =
    r.tls === "none"
      ? "no TLS (plaintext)"
      : `${r.tls === "implicit" ? "implicit TLS" : "STARTTLS required"}, certificate ${r.verify ? "verified" : "NOT verified"}`;
  return `${r.host}:${r.port}, ${tls}, ${r.auth ? `authenticates as ${r.auth.user}` : "no authentication"}`;
}

/**
 * The warning for an unauthenticated peer outside the local network, or
 * null when there is nothing to say. An unauthenticated peer is one the
 * operator chose — plaintext, or TLS without verification — and on a
 * local network that is theirs to choose without comment.
 */
export function unverifiedPeerWarning(r: Relay, addresses: string[]): string | null {
  if (r.tls !== "none" && r.verify) return null;
  const outside = addresses.filter((a) => !isLocalAddress(a));
  if (outside.length === 0) return null;
  const how = r.tls === "none" ? "the connection is plaintext" : "its certificate is not verified";
  const creds = r.auth ? ", and the credentials travel the same path" : "";
  return (
    `[Mailer] WARNING: relay ${r.host} resolves to ${outside.join(", ")}, outside the ` +
    `loopback, private and link-local ranges, and ${how}${creds}.`
  );
}
