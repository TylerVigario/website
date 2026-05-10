/**
 * Post-`next build` real-boot smoke against the just-built server.mjs.
 *
 * Spawns `node server.mjs` from the repo root with hermetic stub env,
 * waits up to 30 seconds for the port to bind, sends SIGTERM, asserts
 * clean exit-0 within a further 10-second budget. Fails the build on:
 * doesn't bind, exits non-zero, doesn't exit at all.
 *
 * Why real-boot instead of `--check`: `--check` (run during
 * build:server) exits at server.ts's flag guard, before any of the
 * code paths that have killed prior releases run — no
 * `app.prepare()`, no `listen()`, no signal handlers exercised. A
 * real boot exercises the bundle resolution + Next bootstrap +
 * listen + shutdown path, catching those classes plus the
 * shutdown-handler-bug class.
 *
 * Hermetic stub env: every required-env value is forced regardless
 * of what's inherited from process.env. Same behavior locally, in
 * CI, and on the deploy host — there's no "stub when absent, real
 * when present" branching. See docs/deployment.md "Build" for the
 * full rationale.
 *
 * Bind-only, no /api/health probe: build-time smoke validates the
 * BUILD ARTIFACT, not runtime app state. /api/health depends on
 * SQLite reachability — out of scope. Port bind = bundle resolved,
 * imports worked, Next bootstrapped, server reached listen().
 * Clean-exit assertion catches shutdown-handler bugs.
 */
import { spawn, type SpawnOptions } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const port = await pickPort();

// SQLITE_PATH must be syntactically valid (absolute path per
// runtime-config.ts validation) but never reach a real file —
// db.ts opens lazily on first request, never at boot. Point at a
// path inside the OS tmpdir that won't get written. The .stub
// suffix is just signage for grep'ers; the load-bearing property
// is db.ts's laziness, not the file name. (Compare landmark's
// db.smoke.invalid, which leans on RFC 6761's reserved-unresolvable
// TLD because Prisma might init eagerly — different mechanism for
// a different DB.)
const stubSqlitePath = path.join(os.tmpdir(), "tylervigario-postbuild-smoke.stub");

// Hermetic stub env — every required value forced regardless of
// inherited env. SENTRY_DSN forced empty so Sentry init no-ops.
// NODE_ENV forced to production so the smoke exercises the prod
// code path, not whatever the parent shell happened to inherit.
//
// NODE_ENV is typed as a readonly literal union by Next's ambient
// declarations and resists direct assignment; build the env as a
// plain Record and cast to ProcessEnv at the spawn boundary.
const env: Record<string, string | undefined> = {
  ...process.env,
  PORT: String(port),
  HOSTNAME: "127.0.0.1",
  SQLITE_PATH: stubSqlitePath,
  SENTRY_DSN: "",
  NODE_ENV: "production",
};

console.log(`  spawning node server.mjs on :${port}`);
const spawnOpts: SpawnOptions = {
  env: env as NodeJS.ProcessEnv,
  stdio: ["ignore", "pipe", "pipe"],
};
const proc = spawn(process.execPath, ["server.mjs"], spawnOpts);

const stdoutChunks: string[] = [];
const stderrChunks: string[] = [];
proc.stdout?.on("data", (b: Buffer) => stdoutChunks.push(b.toString()));
proc.stderr?.on("data", (b: Buffer) => stderrChunks.push(b.toString()));

let exitCode: number | null = null;
let exitSignal: NodeJS.Signals | null = null;
const exited = new Promise<void>((resolve) => {
  proc.on("exit", (code, signal) => {
    exitCode = code;
    exitSignal = signal;
    resolve();
  });
});

const fail = (reason: string): never => {
  console.error(`[postbuild] real-boot smoke failed: ${reason}`);
  console.error(`--- exit: code=${exitCode} signal=${exitSignal} ---`);
  console.error(`--- stdout ---\n${stdoutChunks.join("")}`);
  console.error(`--- stderr ---\n${stderrChunks.join("")}`);
  if (proc.exitCode === null) proc.kill("SIGKILL");
  process.exit(1);
};

const BIND_TIMEOUT_MS = 30_000;
const SHUTDOWN_BUDGET_MS = 10_000;

try {
  await Promise.race([
    waitForPort(port, BIND_TIMEOUT_MS),
    exited.then(() => {
      throw new Error(`server exited before listening (code=${exitCode} signal=${exitSignal})`);
    }),
  ]);
} catch (err) {
  fail((err as Error).message);
}

// SIGTERM and assert clean exit-0 within the shutdown budget. The
// 30s drain cap in server.mjs is the in-flight ceiling, but with no
// in-flight requests the shutdown should complete in well under a
// second. The 10s budget gives generous margin without masking a
// hung handler. Failures here catch shutdown-handler bugs (uncaught
// throw → non-zero exit, deadlocked drain → no exit, signal-driven
// exit → handler didn't process.exit cleanly) that would otherwise
// pass a bind-only smoke and produce SIGKILL-on-deploy noise in prod.
//
// Windows note: Node's child_process can't send POSIX signals, so
// proc.kill("SIGTERM") on Windows is unconditional termination —
// the handler can't run. The clean-exit assertion only runs on
// POSIX platforms where the test is meaningful. CI (Linux) and prod
// (Linux) both run it; local Windows builds get bind-only
// validation with a note that shutdown wasn't tested.
proc.kill("SIGTERM");
await Promise.race([
  exited,
  new Promise<void>((resolve) =>
    setTimeout(() => {
      if (proc.exitCode === null) proc.kill("SIGKILL");
      resolve();
    }, SHUTDOWN_BUDGET_MS).unref(),
  ),
]);

if (process.platform === "win32") {
  console.log(
    "  real-boot smoke ok (Windows: shutdown handler not tested — POSIX signals unavailable)",
  );
} else {
  if (proc.exitCode === null && exitCode === null) {
    fail(`shutdown handler did not exit within ${SHUTDOWN_BUDGET_MS / 1000}s of SIGTERM`);
  }
  if (exitCode !== 0) {
    fail(`shutdown exited via signal=${exitSignal} (expected clean process.exit(0))`);
  }
  console.log("  real-boot smoke ok");
}

// ============================================================
// Helpers
// ============================================================

async function pickPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close(() => {
        if (typeof addr === "object" && addr) resolve(addr.port);
        else reject(new Error("could not pick port"));
      });
    });
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await tryConnect(port)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server did not listen on :${port} within ${timeoutMs}ms`);
}

function tryConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: "127.0.0.1", port });
    sock.once("connect", () => {
      sock.end();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
  });
}
