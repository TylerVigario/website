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
    rules: {
      // The frontmatter is typechecked by `astro check`; the type-aware
      // ESLint rules cannot see through the .astro parser and report
      // every expression as `any`. Duplicated coverage, worse signal.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      // A page may return a Response from its frontmatter: /contact and
      // /pots-migration redirect after a submit. That `return` has no
      // enclosing function, and this rule's return-statement check walks up
      // for one and throws, crashing the whole lint run instead of
      // reporting anything. Only that check is off, and only here; every
      // other void-return check the rule makes still applies.
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { returns: false } }],
    },
  },

  // Config files are plain Node modules with no project entry.
  {
    files: ["*.{js,mjs}", ".*.js", "scripts/**"],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
]);
