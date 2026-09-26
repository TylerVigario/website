/**
 * Lightbox behaviour. No carousel library.
 *
 * The scrolling, snapping and swipe momentum are CSS — this file never
 * animates position. It only opens the dialog, keeps the counter and
 * arrow states in sync with whatever the scroller is doing, and
 * implements the one gesture the platform will not do for us.
 */

/** A rectangle on screen, as getBoundingClientRect gives it. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}

/**
 * The image is drawn `translate(t) scale(s)` about its own centre. Along
 * each axis where the scaled image is larger than the pane, a pan is
 * clamped so the image always covers the pane on that axis: an edge can
 * reach the pane's edge and go no further, so zooming in never reveals
 * the backdrop beside the picture. Along an axis where it still fits, it
 * stays where the layout put it.
 *
 * `img` is the unscaled, untranslated image rectangle.
 */
export function clampPan(t: Point, img: Box, pane: Box, scale: number): Point {
  const axis = (v: number, start: number, size: number, paneStart: number, paneSize: number) => {
    const half = (size * scale) / 2;
    if (half * 2 <= paneSize) return 0;
    const centre = start + size / 2;
    const most = paneStart + half - centre; // leading edge at the pane's leading edge
    const least = paneStart + paneSize - half - centre; // trailing edge at the pane's trailing edge
    return Math.min(most, Math.max(least, v));
  };
  return {
    x: axis(t.x, img.left, img.width, pane.left, pane.width),
    y: axis(t.y, img.top, img.height, pane.top, pane.height),
  };
}

/**
 * The pan that keeps the picture's point `anchor` (a screen point under the
 * old transform) at screen point `to` after a zoom from s0 to s1. Double-
 * click zooms into what was clicked, and a pinch zooms about the fingers
 * and follows them as they move, rather than both zooming into the centre.
 */
export function zoomAbout(
  anchor: Point,
  to: Point,
  centre: Point,
  t0: Point,
  s0: number,
  s1: number,
): Point {
  const q = { x: (anchor.x - centre.x - t0.x) / s0, y: (anchor.y - centre.y - t0.y) / s0 };
  return { x: to.x - centre.x - q.x * s1, y: to.y - centre.y - q.y * s1 };
}

const MAX_SCALE = 4;
const TAP_ZOOM = 2.5;

/** Two-finger pinch, double-tap zoom and one-finger pan, on Pointer Events.
 *
 *  `touch-action: pinch-zoom` would be the delegated version, but
 *  caniuse reports desktop Safari as no-support and iOS Safari as
 *  partial in every release, so on Apple devices it would silently do
 *  nothing. Pointer Events are supported across all 28 targeted
 *  browsers, so the maths lives here instead.
 *
 *  Returns a reset, which the viewer calls when the slide changes and
 *  when it closes: a zoom belongs to the image it was made on.
 */
function makeZoomable(pane: HTMLElement): () => void {
  const img = pane.querySelector("img");
  if (!img) return () => {};

  const points = new Map<number, PointerEvent>();
  let scale = 1;
  let t: Point = { x: 0, y: 0 };

  /** The image's rectangle as the layout placed it, before any transform. */
  const base = (): Box => {
    const r = img.getBoundingClientRect();
    const width = r.width / scale;
    const height = r.height / scale;
    const cx = r.left + r.width / 2 - t.x;
    const cy = r.top + r.height / 2 - t.y;
    return { left: cx - width / 2, top: cy - height / 2, width, height };
  };
  const centreOf = (b: Box): Point => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });

  const apply = () => {
    if (scale <= 1) {
      scale = 1;
      t = { x: 0, y: 0 };
    }
    img.style.transform = scale === 1 ? "" : `translate(${t.x}px, ${t.y}px) scale(${scale})`;
    // While zoomed the pane owns every gesture, so a drag pans the image
    // instead of paging the carousel or starting a swipe-to-dismiss.
    pane.style.touchAction = scale === 1 ? "" : "none";
    pane.dataset.zoomed = scale === 1 ? "" : "true";
  };

  /** Set a new scale and pan, clamped against the layout's rectangle. */
  const set = (s: number, next: Point, b: Box) => {
    scale = Math.min(MAX_SCALE, Math.max(1, s));
    t = clampPan(next, b, pane.getBoundingClientRect(), scale);
    apply();
  };

  // Swipe-down to dismiss: the expected way out of a full-screen viewer
  // on a phone, where the close button is a 44px target in a corner your
  // thumb may not reach. Only at scale 1: while zoomed a drag pans.
  let dismissFrom: Point | null = null;
  let dragged = 0;
  let panFrom: { p: Point; t: Point } | null = null;
  let pinch: { anchor: Point; t: Point; s: number; spread: number; b: Box } | null = null;

  const two = () => {
    const [a, b] = [...points.values()];
    return {
      spread: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      mid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
    };
  };

  pane.addEventListener("pointerdown", (e) => {
    points.set(e.pointerId, e);
    if (points.size === 2) {
      const { spread, mid } = two();
      pinch = { anchor: mid, t, s: scale, spread, b: base() };
      panFrom = null;
      dismissFrom = null;
    } else if (points.size === 1) {
      if (scale > 1) {
        panFrom = { p: { x: e.clientX, y: e.clientY }, t };
        pane.setPointerCapture?.(e.pointerId);
      } else {
        dismissFrom = { x: e.clientX, y: e.clientY };
      }
    }
  });

  pane.addEventListener("pointermove", (e) => {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, e);

    if (points.size === 2 && pinch && pinch.spread > 0) {
      e.preventDefault();
      const { spread, mid } = two();
      const s1 = Math.min(MAX_SCALE, Math.max(1, (pinch.s * spread) / pinch.spread));
      set(s1, zoomAbout(pinch.anchor, mid, centreOf(pinch.b), pinch.t, pinch.s, s1), pinch.b);
      return;
    }

    if (points.size === 1 && panFrom && scale > 1) {
      e.preventDefault();
      set(
        scale,
        { x: panFrom.t.x + e.clientX - panFrom.p.x, y: panFrom.t.y + e.clientY - panFrom.p.y },
        base(),
      );
      return;
    }

    if (points.size === 1 && dismissFrom && scale === 1) {
      const dx = e.clientX - dismissFrom.x;
      const dy = e.clientY - dismissFrom.y;
      // Only claim the gesture once it is clearly vertical, so a
      // horizontal swipe still pages the carousel.
      if (dy > 12 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        dragged = dy;
        pane.style.transform = `translateY(${dy}px)`;
        pane.style.opacity = String(Math.max(0.3, 1 - dy / 400));
      }
    }
  });

  const release = (e: PointerEvent) => {
    points.delete(e.pointerId);
    if (points.size < 2) pinch = null;
    if (points.size === 0) panFrom = null;

    if (dismissFrom && dragged > 0) {
      const dialog = pane.closest("dialog");
      if (dragged > 110 && dialog) dialog.close();
      // Always restore: either the dialog closed and this is reset for
      // next time, or the drag fell short and it springs back.
      pane.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
      pane.style.transform = "";
      pane.style.opacity = "";
      setTimeout(() => (pane.style.transition = ""), 220);
    }
    dismissFrom = null;
    dragged = 0;
  };
  pane.addEventListener("pointerup", release);
  pane.addEventListener("pointercancel", release);

  // Double-tap / double-click toggles, zooming into the point tapped. It
  // is the expected shortcut and the only zoom a mouse user has.
  pane.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (scale > 1) {
      scale = 1;
      apply();
      return;
    }
    const b = base();
    const at = { x: e.clientX, y: e.clientY };
    set(TAP_ZOOM, zoomAbout(at, at, centreOf(b), { x: 0, y: 0 }, 1, TAP_ZOOM), b);
  });

  return () => {
    points.clear();
    pinch = null;
    panFrom = null;
    scale = 1;
    apply();
  };
}

export function mountLightbox() {
  // One pass per DIALOG, not per grid. A case study can show several
  // grids that open the same viewer (italesowell has three, pipetree two),
  // and setting the viewer up once per grid attached every handler that
  // many times: a double-click toggled zoom twice on pipetree and so did
  // nothing, and each extra zoom handler measured the image the previous
  // one had just moved. The mounted flag makes a second call harmless too.
  for (const dialog of document.querySelectorAll<HTMLDialogElement>("[data-lightbox-dialog]")) {
    if (dialog.dataset.mounted) continue;
    dialog.dataset.mounted = "true";
    const id = dialog.dataset.lightboxDialog ?? "";
    const grids = document.querySelectorAll<HTMLElement>(`[data-lightbox="${CSS.escape(id)}"]`);

    const track = dialog.querySelector<HTMLElement>("[data-track]");
    const slides = [...dialog.querySelectorAll<HTMLElement>("[data-slide]")];
    const counter = dialog.querySelector<HTMLElement>("[data-counter]");
    const prev = dialog.querySelector<HTMLButtonElement>("[data-prev]");
    const next = dialog.querySelector<HTMLButtonElement>("[data-next]");
    const thumbs = [...dialog.querySelectorAll<HTMLButtonElement>("[data-thumb]")];
    if (!track || slides.length === 0) continue;

    let current = 0;
    const resets = [...dialog.querySelectorAll<HTMLElement>("[data-zoom]")].map(makeZoomable);
    const resetZoom = () => resets.forEach((reset) => reset());

    const sync = (index: number) => {
      if (index !== current) resetZoom();
      current = index;
      if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
      for (const [i, thumb] of thumbs.entries()) {
        thumb.setAttribute("aria-current", String(i === index));
      }
      // Keep the active thumbnail in view without yanking the page.
      thumbs[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };

    // The scroller is the source of truth for which slide is showing —
    // whether it got there by swipe, arrow key or button.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio > 0.6) {
            sync(Number((entry.target as HTMLElement).dataset.slide));
          }
        }
      },
      { root: track, threshold: [0.6] },
    );
    for (const slide of slides) io.observe(slide);

    const goTo = (index: number, smooth = true) => {
      const target = slides[Math.min(slides.length - 1, Math.max(0, index))];
      if (!target) return;
      track.scrollTo({ left: target.offsetLeft, behavior: smooth ? "smooth" : "instant" });
      sync(Number(target.dataset.slide));
    };

    prev?.addEventListener("click", () => goTo(current - 1));
    next?.addEventListener("click", () => goTo(current + 1));
    for (const thumb of thumbs) {
      thumb.addEventListener("click", () => goTo(Number(thumb.dataset.thumb)));
    }

    // Feature-detect rather than assume. Where <dialog> is missing the
    // handler does nothing and the anchor's own navigation takes over,
    // opening the image directly. Nothing is intercepted that cannot
    // then be delivered.
    const canModal = typeof dialog.showModal === "function";

    const openFrom = (e: Event) => {
      const link = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!link || !canModal) return;
      // Let modified clicks through — open-in-new-tab must keep working.
      const me = e as MouseEvent;
      if (me.metaKey || me.ctrlKey || me.shiftKey || me.button !== 0) return;
      e.preventDefault();
      dialog.showModal(); // top layer, focus trap, ESC — from the browser
      // Jump without animating, so opening lands on the right image
      // rather than scrolling past the ones before it.
      goTo(Number(link.dataset.index), false);
    };
    for (const grid of grids) grid.addEventListener("click", openFrom);

    dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", resetZoom);

    // Click outside the picture to close. The panes fill the dialog, so a
    // click on the dimmed area lands on a pane, a slide or the track, never
    // on the dialog itself, which is all this used to check for. So: any
    // click that is not on the image or a control closes, unless it ended
    // a drag, which a pan or a swipe that finishes on the backdrop is.
    let downAt: Point | null = null;
    dialog.addEventListener("pointerdown", (e) => (downAt = { x: e.clientX, y: e.clientY }));
    dialog.addEventListener("click", (e) => {
      const moved = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 0;
      downAt = null;
      if (moved > 6) return;
      const target = e.target as HTMLElement;
      if (target.closest("img, button, a")) return;
      dialog.close();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    });

    sync(0);
  }
}
