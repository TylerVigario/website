/**
 * What each image's `sizes` attribute says, per place an image is laid out.
 *
 * `sizes` is the browser's only knowledge of how wide an image will be
 * drawn, and it picks a file from the srcset before layout runs. Too wide,
 * and every visitor downloads the next file up: the screenshots here said
 * "50vw" and "100vw", and on a phone or a wide desktop they were fetched at
 * up to twice the width they are drawn. Too narrow, and the image is soft.
 *
 * Each value below is derived from its container, and was measured against
 * the rendered width in Chromium at 360 to 1920px. The constants every
 * derivation shares:
 *
 *   - the page container is max-w-6xl (72rem, 1152px) with px-6, so content
 *     is 100vw - 48px wide, and 1104px once the viewport reaches 1152px
 *   - each image sits inside a 1px border on both sides, another 2px
 *   - gap-6 is 24px
 *
 * Change a container's classes and its `sizes` here changes with it: the
 * screenshot grids carry both, so the two cannot be edited apart.
 */

/** A grid of images: its classes, and the width each cell draws at. */
export interface ImageGrid {
  class: string;
  sizes: string;
}

/** The case studies' screenshots: one column, then two from md (768px).
 *  Two columns: (100vw - 48 - 24) / 2 - 2 = 50vw - 38px, until the
 *  container stops growing at 1152px: (1104 - 24) / 2 - 2 = 538px. */
export const SCREENSHOT_GRID: ImageGrid = {
  class: "grid gap-6 md:grid-cols-2",
  sizes: "(min-width: 1152px) 538px, (min-width: 768px) calc(50vw - 38px), calc(100vw - 50px)",
};

/** Phone screenshots: two columns from sm (640px) inside max-w-3xl (768px),
 *  so they stop growing once the grid reaches 768px, at a viewport of
 *  816px: (768 - 24) / 2 - 2 = 370px. */
export const PHONE_SCREENSHOT_GRID: ImageGrid = {
  class: "mx-auto grid max-w-3xl gap-6 sm:grid-cols-2",
  sizes: "(min-width: 816px) 370px, (min-width: 640px) calc(50vw - 38px), calc(100vw - 50px)",
};

/** A case study's card on /work: one column, then two from lg (1024px),
 *  the same arithmetic as the screenshot grid from there. */
export const WORK_CARD_SIZES =
  "(min-width: 1152px) 538px, (min-width: 1024px) calc(50vw - 38px), calc(100vw - 50px)";

/** The image beside a case study's introduction: the 1.1fr column of
 *  lg:grid-cols-[0.9fr_1.1fr] with gap-12 (48px), so 0.55 of what the gap
 *  leaves: (100vw - 48 - 48) * 0.55 - 2 = 55vw - 55px, and
 *  (1104 - 48) * 0.55 - 2 = 579px from 1152px. */
export const CASE_STUDY_LEAD_SIZES =
  "(min-width: 1152px) 579px, (min-width: 1024px) calc(55vw - 55px), calc(100vw - 50px)";

/** Two photos side by side from sm (640px) in the page container: the
 *  screenshot grid's arithmetic, two columns from a narrower breakpoint. */
export const PHOTO_PAIR: ImageGrid = {
  class: "grid gap-6 sm:grid-cols-2",
  sizes: "(min-width: 1152px) 538px, (min-width: 640px) calc(50vw - 38px), calc(100vw - 50px)",
};

/** A /services band's picture: half of lg:grid-cols-2 with gap-12 from
 *  1024px, (100vw - 48 - 48) / 2 - 2 = 50vw - 50px, until the container
 *  stops growing at 1152px: (1104 - 48) / 2 - 2 = 526px. Full width below. */
export const BAND_IMAGE_SIZES =
  "(min-width: 1152px) 526px, (min-width: 1024px) calc(50vw - 50px), calc(100vw - 50px)";

/** A /services band's picture with a phone screen over its corner. The
 *  band's column is 528px from 1152px, 50vw - 48px from 1024px, and
 *  100vw - 48px below; the screenshot takes 85% of it and the phone 30%,
 *  each 2px less for its border. */
export const BAND_PAIR = {
  desktop: "(min-width: 1152px) 447px, (min-width: 1024px) calc(42.5vw - 43px), calc(85vw - 43px)",
  phone: "(min-width: 1152px) 156px, (min-width: 1024px) calc(15vw - 16px), calc(30vw - 16px)",
};
