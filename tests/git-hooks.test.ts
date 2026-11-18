import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * git runs the hooks straight from .husky/, which core.hooksPath names.
 * It skips a hook file that is not executable, printing a hint that is
 * easy to miss, and runs one with no shebang through no shell it chose.
 * So each tracked hook is held here to what git needs to run it, and
 * `prepare` to the script that points git at the folder.
 */

/** Each tracked file under .husky/, with the mode git records for it. */
function trackedHooks(): { mode: string; path: string }[] {
  const out = execFileSync("git", ["ls-files", "-s", ".husky"], { encoding: "utf8" });
  return out
    .trim()
    .split("\n")
    .map((line) => {
      const [meta = "", path = ""] = line.split("\t");
      return { mode: meta.split(" ")[0] ?? "", path };
    });
}

describe("the git hooks", () => {
  it("are the three this repository runs", () => {
    expect(trackedHooks().map((h) => h.path)).toEqual([
      ".husky/commit-msg",
      ".husky/pre-commit",
      ".husky/pre-push",
    ]);
  });

  it("are each recorded as executable, so git runs them", () => {
    for (const hook of trackedHooks()) expect(hook, hook.path).toMatchObject({ mode: "100755" });
  });

  it("each start with a shell and stop at the first failing command", () => {
    for (const { path } of trackedHooks()) {
      const [shebang, , setE] = readFileSync(path, "utf8").split("\n");
      expect(shebang, path).toBe("#!/bin/sh");
      expect(setE, path).toBe("set -e");
    }
  });

  it("are pointed at by the install, not by a tool that generates its own folder", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.scripts.prepare).toBe("node scripts/install-hooks.ts");
    expect(pkg.devDependencies).not.toHaveProperty("husky");
    expect(readFileSync("scripts/install-hooks.ts", "utf8")).toContain(
      '["config", "core.hooksPath", ".husky"]',
    );
  });
});
