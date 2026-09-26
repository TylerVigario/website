import { describe, expect, it } from "vitest";
import { clampPan, zoomAbout, type Box } from "@/scripts/lightbox";

/**
 * The zoomed viewer draws the image `translate(t) scale(s)` about its own
 * centre. These are the two pieces of maths the gestures rest on; the
 * gestures themselves need a real browser and are exercised there.
 */
const pane: Box = { left: 0, top: 0, width: 1000, height: 800 };

describe("clampPan", () => {
  const centred: Box = { left: 100, top: 100, width: 800, height: 600 };

  it("lets an edge reach the pane's edge and no further", () => {
    // 1600 wide at 2x in a 1000 pane: 300 either way before an edge shows.
    expect(clampPan({ x: 1000, y: 0 }, centred, pane, 2).x).toBe(300);
    expect(clampPan({ x: -1000, y: 0 }, centred, pane, 2).x).toBe(-300);
    expect(clampPan({ x: 120, y: 0 }, centred, pane, 2).x).toBe(120);
  });

  it("does not move an axis the zoomed image still fits", () => {
    const wide: Box = { left: 100, top: 250, width: 800, height: 300 };
    expect(clampPan({ x: 0, y: 500 }, wide, pane, 2).y).toBe(0); // 600 tall in 800
  });

  it("works from where the layout put the image, not from the pane's centre", () => {
    // Left-aligned, as the pane lays out an image narrower than itself.
    const left: Box = { left: 0, top: 100, width: 600, height: 600 };
    // 1200 wide at 2x: from its right edge on the pane's right (t = 100)
    // to its left edge on the pane's left (t = 300).
    expect(clampPan({ x: 0, y: 0 }, left, pane, 2).x).toBe(100);
    expect(clampPan({ x: 999, y: 0 }, left, pane, 2).x).toBe(300);
  });

  it("is always zero at 1x", () => {
    expect(clampPan({ x: 50, y: -50 }, centred, pane, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe("zoomAbout", () => {
  it("keeps the point that was clicked under the pointer", () => {
    const centre = { x: 500, y: 400 };
    const at = { x: 700, y: 500 };
    const t = zoomAbout(at, at, centre, { x: 0, y: 0 }, 1, 2.5);
    // The clicked point, 200 right and 100 down of centre, lands back on itself.
    expect(centre.x + t.x + 200 * 2.5).toBeCloseTo(at.x);
    expect(centre.y + t.y + 100 * 2.5).toBeCloseTo(at.y);
  });

  it("follows the fingers when a pinch moves as well as spreads", () => {
    const centre = { x: 500, y: 400 };
    const t = zoomAbout({ x: 500, y: 400 }, { x: 540, y: 400 }, centre, { x: 0, y: 0 }, 1, 2);
    expect(t).toEqual({ x: 40, y: 0 }); // same point, carried 40 px right
  });
});
