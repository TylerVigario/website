/**
 * Modules the built server must resolve from node_modules at runtime,
 * rather than have bundled into it.
 *
 * Single source of truth, imported by BOTH astro.config.mjs (which
 * tells Vite to leave them external) and scripts/make-release.mjs
 * (which installs exactly these into the artifact). One list, so the
 * artifact cannot disagree with the build about what the server needs.
 *
 * Keep it minimal. Everything not listed here gets bundled by
 * `ssr.noExternal`, which is what keeps the release artifact at ~11 MB
 * instead of the ~200 MB a plain `npm ci --omit=dev` produces — that
 * install is almost entirely Astro's build toolchain (rolldown, vite,
 * esbuild, shiki, sharp), none of which the running server touches.
 *
 * better-sqlite3 is here because it is a native addon: a .node binary
 * cannot be bundled into JavaScript. Nothing else currently qualifies.
 *
 * NOTE: this list cannot be derived by scanning the built bundle.
 * Bundled vendor code contains specifier strings of its own — sharp's
 * optional-dependency probing mentions @img/sharp-libvips-dev, which is
 * a dead path, not a dependency. Declaring the list is the honest way.
 */
export const RUNTIME_EXTERNALS = ["better-sqlite3"];
