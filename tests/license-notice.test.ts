import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

/**
 * LICENSE-NOTICE.md reserves the brand imagery, file by file, because a
 * reservation is only as good as its list. That list drifted once already:
 * #36 replaced public/icon.svg with three PNG icons, the notice kept naming
 * the file that was gone, and the logo in its new formats was reserved
 * nowhere — which, in a repository published under the AGPL, reads as
 * granted. Every file in public/ is the logo in some format, so every one
 * has to be named.
 */
describe("LICENSE-NOTICE.md", () => {
  const notice = readFileSync("LICENSE-NOTICE.md", "utf8");

  it.each(readdirSync("public"))("reserves public/%s by name", (file) => {
    // Either form counts: `favicon.ico` or `public/favicon.ico`.
    expect(notice.includes(`\`${file}\``) || notice.includes(`\`public/${file}\``)).toBe(true);
  });

  it("reserves src/assets/images/ in full", () => {
    expect(notice).toContain("`src/assets/images/` in full");
  });

  // The one exception to "in full": a photograph that is not ours to
  // reserve. Each is credited by path, so one added without a credit, or
  // left credited after it is gone, fails here.
  const stock = readdirSync("src/assets/images/stock");
  it.each(stock)("credits stock/%s, and does not reserve it", (file) => {
    expect(notice).toContain(`\`src/assets/images/stock/${file}\``);
  });

  it("credits no stock photo that is gone", () => {
    const credited = [...notice.matchAll(/`src\/assets\/images\/stock\/([^`]+)`/g)].map(
      (m) => m[1],
    );
    expect(credited.sort()).toEqual([...stock].sort());
  });
});
