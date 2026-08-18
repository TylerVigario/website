import { describe, expect, it } from "vitest";
import { compare, parseManifest } from "../scripts/verify-install.mjs";

const H = (n: string) => n.repeat(64).slice(0, 64);

describe("published-manifest comparison", () => {
  it("passes when the tree matches exactly", () => {
    const m = new Map([["a.js", H("a")]]);
    expect(compare(m, new Map(m))).toEqual({ changed: [], missing: [], unexpected: [] });
  });

  it("catches a modified file", () => {
    const r = compare(new Map([["a.js", H("a")]]), new Map([["a.js", H("b")]]));
    expect(r.changed).toEqual(["a.js"]);
  });

  it("catches a deleted file", () => {
    const r = compare(new Map([["a.js", H("a")]]), new Map());
    expect(r.missing).toEqual(["a.js"]);
  });

  // The case a one-directional check misses entirely, and the one that
  // matters most: nothing legitimate ever writes into a release tree, so
  // a file the release never published is the signal worth alarming on.
  it("catches a file that was never published", () => {
    const r = compare(new Map(), new Map([["dropped-in.php", H("c")]]));
    expect(r.unexpected).toEqual(["dropped-in.php"]);
  });

  it("reports all three at once rather than stopping at the first", () => {
    const r = compare(
      new Map([
        ["same.js", H("a")],
        ["edited.js", H("b")],
        ["gone.js", H("c")],
      ]),
      new Map([
        ["same.js", H("a")],
        ["edited.js", H("d")],
        ["extra.js", H("e")],
      ]),
    );
    expect(r).toEqual({ changed: ["edited.js"], missing: ["gone.js"], unexpected: ["extra.js"] });
  });
});

describe("manifest parsing", () => {
  it("reads sha256sum format, including paths containing spaces", () => {
    const m = parseManifest(`${H("a")}  dir/file name.js\n${H("b")}  other.js\n`);
    expect(m.get("dir/file name.js")).toBe(H("a"));
    expect(m.size).toBe(2);
  });

  it("ignores blank lines and junk rather than inventing entries", () => {
    expect(parseManifest("\n# comment\nnot-a-hash file\n").size).toBe(0);
  });
});
