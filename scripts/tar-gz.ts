/**
 * Writes a directory as a gzipped tar whose bytes depend on nothing but
 * the tree, its timestamp and the Node that runs this.
 *
 * The release archive used to be written by the machine's GNU tar and
 * gzip, whose versions nothing in the tree names, so a rebuild matched
 * only while the machine's happened to lay the bytes out the same way.
 * Written here, the archive is made by the Node `.nvmrc` names: the tar
 * by this code, the compression by that Node's zlib.
 *
 * The tar is the one GNU tar writes with `--format=gnu --sort=name
 * --owner=0 --group=0 --numeric-owner` and every timestamp set to the
 * commit's, byte for byte; tests/tar-gz.test.ts holds it to GNU tar's own
 * output. Entries come in byte order of their names, each directory
 * before what it holds. A file is 0644, or 0755 if any execute bit is
 * set, and a directory 0755, so the builder's umask reaches nothing. A
 * name over 100 bytes goes first in a GNU long-name record, as GNU tar
 * writes it.
 *
 * Compression is reproducible only by the same zlib. nodejs.org's builds
 * carry their own; a distribution's may link the system's instead
 * (Fedora's nodejs24 links zlib-ng), which compresses the same tar into
 * different bytes. `sharedZlib` says which this Node is.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BLOCK = 512;
/** GNU tar's default record: 20 blocks. The archive ends on a whole one. */
const RECORD = 20 * BLOCK;

/** Whether this Node compresses with a zlib it was not built with. */
export const sharedZlib = Boolean(
  (process.config.variables as Record<string, unknown>).node_shared_zlib,
);

/** A numeric field: octal, zero-padded, ending in NUL, as GNU tar writes it. */
function octal(value: number, width: number): string {
  const digits = value.toString(8);
  if (digits.length > width - 1) throw new Error(`${value} does not fit a ${width}-byte tar field`);
  return digits.padStart(width - 1, "0") + "\0";
}

function header(name: Buffer, mode: number, size: number, mtime: number, type: string): Buffer {
  const h = Buffer.alloc(BLOCK);
  name.copy(h, 0, 0, Math.min(name.length, 100));
  h.write(octal(mode, 8), 100, "ascii");
  h.write(octal(0, 8), 108, "ascii"); // uid
  h.write(octal(0, 8), 116, "ascii"); // gid
  h.write(octal(size, 12), 124, "ascii");
  h.write(octal(mtime, 12), 136, "ascii");
  h.write(" ".repeat(8), 148, "ascii"); // the checksum counts its own field as spaces
  h.write(type, 156, "ascii");
  h.write("ustar  \0", 257, "ascii"); // GNU's magic and version
  let sum = 0;
  for (const byte of h) sum += byte;
  h.write(octal(sum, 7) + " ", 148, "ascii");
  return h;
}

/** The data, padded with zeros to a whole number of blocks. */
const padded = (data: Buffer) =>
  data.length % BLOCK === 0
    ? data
    : Buffer.concat([data, Buffer.alloc(BLOCK - (data.length % BLOCK))]);

const byBytes = (a: string, b: string) => Buffer.compare(Buffer.from(a), Buffer.from(b));

/**
 * The tar of `name`, a directory inside `parent`, with every entry under
 * `name/` and every timestamp `mtime` (seconds since the epoch).
 */
export function tar(parent: string, name: string, mtime: number): Buffer {
  const out: Buffer[] = [];

  const entry = (member: string, mode: number, type: string, data: Buffer) => {
    const nameBytes = Buffer.from(member, "utf8");
    if (nameBytes.length > 100) {
      const long = Buffer.concat([nameBytes, Buffer.alloc(1)]);
      out.push(header(Buffer.from("././@LongLink"), 0o644, long.length, 0, "L"), padded(long));
    }
    out.push(header(nameBytes, mode, data.length, mtime, type));
    if (data.length > 0) out.push(padded(data));
  };

  // A link would be archived as itself, and the manifest does not follow
  // one, so nothing would check where it points.
  const refused = (member: string) =>
    new Error(`${member} is neither a file nor a directory, and the archive takes neither`);

  // Opened once, without following a link, and the type, mode and bytes
  // all taken from that descriptor, so what is archived is what was
  // checked: a file swapped for a link after the directory was read is
  // refused, not read through.
  const file = (member: string, full: string) => {
    const fd = fs.openSync(full, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const st = fs.fstatSync(fd);
      if (!st.isFile()) throw refused(member);
      entry(member, st.mode & 0o111 ? 0o755 : 0o644, "0", fs.readFileSync(fd));
    } finally {
      fs.closeSync(fd);
    }
  };

  const directory = (member: string, full: string) => {
    entry(`${member}/`, 0o755, "5", Buffer.alloc(0));
    const children = fs
      .readdirSync(full, { withFileTypes: true })
      .sort((a, b) => byBytes(a.name, b.name));
    for (const child of children) {
      const childMember = `${member}/${child.name}`;
      const childFull = path.join(full, child.name);
      if (child.isDirectory()) directory(childMember, childFull);
      else if (child.isFile()) file(childMember, childFull);
      else throw refused(childMember);
    }
  };

  directory(name, path.join(parent, name));
  out.push(Buffer.alloc(2 * BLOCK)); // end of archive
  const body = Buffer.concat(out);
  const rest = body.length % RECORD;
  return rest === 0 ? body : Buffer.concat([body, Buffer.alloc(RECORD - rest)]);
}

/** `tar()`, gzipped at the highest level, with no name or time in the gzip header. */
export const tarGz = (parent: string, name: string, mtime: number): Buffer =>
  zlib.gzipSync(tar(parent, name, mtime), { level: zlib.constants.Z_BEST_COMPRESSION });
