import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import prettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", ".astro/**"]),

  // Type-aware rules across the TS surface. `projectService` picks up
  // tsconfig, which now includes .astro files.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },

  // .astro needs its own parser — without it every component file is a
  // parse error, which is what "Parsing error" meant across 17 files
  // during the port.
  ...astro.configs.recommended,
  {
    files: ["**/*.astro"],
    // astro-eslint-parser has no projectService and said so on every
    // .astro file, then used project: true instead. Asking for that
    // directly gives the same type information without the warning.
    languageOptions: {
      parserOptions: { projectService: false, project: true },
    },
    rules: {
      // The frontmatter is typechecked by `astro check`; the type-aware
      // ESLint rules cannot see through the .astro parser and report
      // every expression as `any`. Duplicated coverage, worse signal.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  // The two JavaScript configs, which are in no tsconfig. Everything
  // else, scripts/ and astro.config.ts included, is TypeScript in the
  // project and linted with types.
  {
    files: ["*.js", ".*.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
]);
