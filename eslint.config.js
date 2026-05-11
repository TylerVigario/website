import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  // TypeScript type-aware rules for all TS/JS files
  // Includes: no-floating-promises, no-misused-promises, await-thenable, no-unused-vars, etc.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Next.js + React rules only for src/ (React, hooks, a11y, Next.js specific)
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    extends: [...nextVitals, ...nextTs],
  },

  // Prettier must come last to override formatting rules
  prettier,

  // Rule customizations
  {
    rules: {
      // Allow underscore-prefixed variables to be unused (common convention)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Override default ignores of eslint-config-next + add our own
  globalIgnores([
    // Build outputs
    ".next/**",
    "out/**",
    "build/**",
    "server.js",
    // Generated files
    "next-env.d.ts",
    // Root config files (not in tsconfig)
    ".commitlintrc.js",
    "eslint.config.js",
    "postcss.config.js",
    // Build / pipeline scripts (run via tsx, not part of the app
    // type graph)
    "scripts/**",
  ]),
]);

export default eslintConfig;
