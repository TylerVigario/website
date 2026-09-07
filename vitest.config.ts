import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The `@/*` alias is declared in tsconfig for the editor and for
  // Astro's build, but vitest resolves independently of both — without
  // this, any test importing through the alias fails to resolve.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    // Node by default. Most suites here are structural and a DOM would
    // only slow them; the one that needs a browser opts in with a
    // `@vitest-environment jsdom` docblock, which keeps the cost on the
    // file that asked for it.
  },
});
