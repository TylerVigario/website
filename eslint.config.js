import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import css from "@eslint/css";
import { tailwind4 } from "tailwind-csstree";
import baselineJs from "eslint-plugin-baseline-js";
import prettier from "eslint-config-prettier";
import pkg from "./package.json" with { type: "json" };

// The Baseline year package.json's browserslist names, so the CSS and
// the browser code are checked against the browsers the build serves.
const BASELINE_YEAR = Number(/\bbaseline (\d{4})\b/.exec(pkg.browserslist.join(","))?.[1]);
if (!BASELINE_YEAR) throw new Error("eslint.config.js: the browserslist names no Baseline year");

export default defineConfig([
  globalIgnores(["dist/**", "dist-release/**", "node_modules/**", ".astro/**"]),

  // Type-aware rules across the TS surface. `projectService` picks up
  // tsconfig, which now includes .astro files. Scoped to code: applied to
  // the CSS file, a rule that needs type information stops ESLint.
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,astro}"],
    extends: [tseslint.configs.recommendedTypeChecked],
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

  // Each <script> in an .astro file reaches ESLint as a virtual file,
  // `Component.astro/1_1.ts`, which no tsconfig can contain. Left under
  // the projectService above, it failed to parse, and eslint-plugin-astro
  // drops a message with no line, so every script went unlinted and
  // unreported. They get the rules that need no type information;
  // `astro check` typechecks them, as it does the frontmatter.
  {
    files: ["**/*.astro/*.ts", "**/*.astro/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  // The two JavaScript configs, which are in no tsconfig. Everything
  // else, scripts/ and astro.config.ts included, is TypeScript in the
  // project and linted with types.
  {
    files: ["*.js", ".*.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  // The code that runs in the browser, against the browsers the site is
  // built for. The rest runs on Node, which no Baseline year describes;
  // a module the browser gets from anywhere else belongs in this list.
  // With types, a method is checked by what it is called on, which is
  // how `set.difference()` or `array.toSorted()` is found.
  {
    files: ["src/scripts/**/*.ts", "src/lib/forms/**/*.ts", "src/lib/retention.ts"],
    plugins: { "baseline-js": baselineJs },
    extends: [baselineJs.configs["recommended-ts"]({ available: BASELINE_YEAR })],
  },
  // The scripts in .astro files have no types, so they get the checks
  // that need none: a global or a static such as `Object.groupBy()`, not
  // a method. The plugin's preset for that applies only to .js files, and
  // these arrive as .ts, so the rule is set here instead.
  {
    files: ["**/*.astro/*.ts", "**/*.astro/*.js"],
    plugins: { "baseline-js": baselineJs },
    rules: {
      "baseline-js/use-baseline": [
        "error",
        {
          available: BASELINE_YEAR,
          includeWebApis: { preset: "auto" },
          includeJsBuiltins: { preset: "auto" },
        },
      ],
    },
  },

  // The CSS the site writes, against the browsers it is built for. Only
  // the source: in Tailwind's output, use-baseline cannot tell a feature
  // with a fallback or an @supports guard from a bare one, so it reports
  // a colour the build gave a fallback exactly as one it did not.
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    languageOptions: { customSyntax: tailwind4 },
    extends: ["css/recommended"],
    rules: {
      "css/use-baseline": ["error", { available: BASELINE_YEAR }],
      // The variables are declared in @theme, which this rule does not
      // read, so every one of them was reported as unknown.
      "css/no-invalid-properties": ["error", { allowUnknownVariables: true }],
    },
  },

  prettier,
]);
