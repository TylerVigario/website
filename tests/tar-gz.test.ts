import { afterAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { tar, tarGz } from "../scripts/tar-gz.ts";

/**
 * The release archive is written by scripts/tar-gz.ts, not by GNU tar, so
 * that the Node .nvmrc names is the whole toolchain. Every program that
 * reads a tar knows GNU tar's format, and the writer's claim is that its
 * output is GNU tar's, byte for byte. That is compared here, on a tree
 * holding each case the writer handles: nested directories, names whose
 * byte order and character order differ, a name long enough for a GNU
 * long-name record, an executable, an empty file and one of exactly a
 * block. GNU tar is on every CI runner; elsewhere the comparison is
 * skipped and says so.
 */

const gnuTar = (() => {
  try {
    return execFileSync("tar", ["--version"], { encoding: "utf8" }).includes("GNU tar");
  } catch {
    return false;
  }
})();

const MTIME = 1_700_000_000;

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/** A tree in a fresh directory, with the modes the writer would give it. */
function fixture(): { parent: string; name: string } {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "tar-gz-"));
  made.push(parent);
  const name = "release-1.0.0";
  const files: [string, string | Buffer, number][] = [
    ["LICENSE", "licence\n", 0o644],
    ["LICENSE-NOTICE.md", "notice\n", 0o644],
    ["a-b", "", 0o644],
    ["a.b", "x".repeat(512), 0o644],
    ["Zeta", "upper case sorts first\n", 0o644],
    // U+FF5E sorts before U+1F600 by UTF-8 bytes, after it by UTF-16 units.
    ["\u{FF5E}", "fullwidth tilde\n", 0o644],
    ["\u{1F600}", "emoji\n", 0o644],
    ["bin/run", "#!/bin/sh\n", 0o755],
    [`dist/${"long-".repeat(25)}name.js`, "export {};\n", 0o644],
    ["dist/client/_astro/x.js", Buffer.from([0, 1, 2, 255]), 0o644],
  ];
  for (const [file, data, mode] of files) {
    const full = path.join(parent, name, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
    fs.chmodSync(full, mode);
  }
  const dirs = (dir: string): string[] => [
    dir,
    ...fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap((e) => dirs(path.join(dir, e.name))),
  ];
  for (const dir of dirs(path.join(parent, name))) fs.chmodSync(dir, 0o755);
  return { parent, name };
}

describe("the release archive", () => {
  it.skipIf(!gnuTar)("is the tar GNU tar writes, byte for byte", () => {
    const { parent, name } = fixture();
    const gnu = execFileSync(
      "tar",
      [
        "--sort=name",
        `--mtime=@${MTIME}`,
        "--owner=0",
        "--group=0",
        "--numeric-owner",
        "--format=gnu",
        "-cf",
        "-",
        "-C",
        parent,
        name,
      ],
      { maxBuffer: 1 << 26 },
    );
    expect(Buffer.compare(tar(parent, name, MTIME), gnu)).toBe(0);
  });

  it("is that tar gzipped, with no name or time in the gzip header", () => {
    const { parent, name } = fixture();
    const gz = tarGz(parent, name, MTIME);
    expect(Buffer.compare(zlib.gunzipSync(gz), tar(parent, name, MTIME))).toBe(0);
    expect(gz.readUInt32LE(4)).toBe(0); // MTIME
    expect(gz.readUInt8(3) & 0x08).toBe(0); // FNAME
  });

  it.skipIf(process.platform === "win32")("refuses what it would not check", () => {
    const { parent, name } = fixture();
    fs.symlinkSync("LICENSE", path.join(parent, name, "link"));
    expect(() => tar(parent, name, MTIME)).toThrow(/neither a file nor a directory/);
  });
});
