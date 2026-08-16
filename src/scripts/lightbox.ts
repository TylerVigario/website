/**
 * Lightbox behaviour. No carousel library.
 *
 * The scrolling, snapping and swipe momentum are CSS — this file never
 * animates position. It only opens the dialog, keeps the counter and
 * arrow states in sync with whatever the scroller is doing, and
 * implements the one gesture the platform will not do for us.
 */

/** Two-finger pinch and double-tap zoom, on Pointer Events.
 *
 *  `touch-action: pinch-zoom` would be the delegated version, but
 *  caniuse reports desktop Safari as no-support and iOS Safari as
 *  partial in every release, so on Apple devices it would silently do
 *  nothing. Pointer Events are supported across all 28 targeted
 *  browsers, so the maths lives here instead.
 */
function makeZoomable(pane: HTMLElement) {
  const img = pane.querySelector("img");
  if (!img) return;

  const points = new Map<number, PointerEvent>();
  let scale = 1;
  let startScale = 1;
  let startSpread = 0;

  // Swipe-down to dismiss: the expected way out of a full-screen viewer
  // on a phone, where the close button is a 44px target in a corner your
  // thumb may not reach. Only active at scale 1 — while zoomed a drag
  // means pan, not dismiss.
  let dragFrom: { x: number; y: number } | null = null;
  let dragged = 0;

  const apply = () => {
    img.style.transform = scale === 1 ? "" : `scale(${scale})`;
    // While zoomed the pane owns the gesture, so a drag pans the image
    // instead of scrolling the carousel to the next slide.
    pane.style.touchAction = scale === 1 ? "" : "none";
    pane.dataset.zoomed = scale === 1 ? "" : "true";
  };

  const spread = () => {
    const [a, b] = [...points.values()];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  pane.addEventListener("pointerdown", (e) => {
    points.set(e.pointerId, e);
    if (points.size === 2) {
      startSpread = spread();
      startScale = scale;
      dragFrom = null;
    } else if (points.size === 1 && scale === 1) {
      dragFrom = { x: e.clientX, y: e.clientY };
    }
  });

  pane.addEventListener("pointermove", (e) => {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, e);

    if (points.size === 2 && startSpread > 0) {
      e.preventDefault();
      scale = Math.min(4, Math.max(1, (startScale * spread()) / startSpread));
      apply();
      return;
    }

    if (points.size === 1 && dragFrom && scale === 1) {
      const dx = e.clientX - dragFrom.x;
      const dy = e.clientY - dragFrom.y;
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
    if (points.size < 2) startSpread = 0;

    if (dragFrom && dragged > 0) {
      const dialog = pane.closest("dialog");
      if (dragged > 110 && dialog) {
        dialog.close();
      }
      // Always restore: either the dialog closed and this is reset for
      // next time, or the drag fell short and it springs back.
      pane.style.transition = "transform 0.2s ease-out, opacity 0.2s ease-out";
      pane.style.transform = "";
      pane.style.opacity = "";
      setTimeout(() => (pane.style.transition = ""), 220);
    }
    dragFrom = null;
    dragged = 0;
  };
  pane.addEventListener("pointerup", release);
  pane.addEventListener("pointercancel", release);

  // Double-tap / double-click toggles, which is the expected shortcut
  // and the only zoom affordance a mouse user has.
  pane.addEventListener("dblclick", (e) => {
    e.preventDefault();
    scale = scale > 1 ? 1 : 2.5;
    apply();
  });
}

export function mountLightbox() {
  for (const grid of document.querySelectorAll<HTMLElement>("[data-lightbox]")) {
    const id = grid.dataset.lightbox;
    const dialog = document.querySelector<HTMLDialogElement>(`[data-lightbox-dialog="${id}"]`);
    if (!dialog) continue;

    const track = dialog.querySelector<HTMLElement>("[data-track]");
    const slides = [...dialog.querySelectorAll<HTMLElement>("[data-slide]")];
    const counter = dialog.querySelector<HTMLElement>("[data-counter]");
    const prev = dialog.querySelector<HTMLButtonElement>("[data-prev]");
    const next = dialog.querySelector<HTMLButtonElement>("[data-next]");
    const thumbs = [...dialog.querySelectorAll<HTMLButtonElement>("[data-thumb]")];
    if (!track || slides.length === 0) continue;

    let current = 0;

    const sync = (index: number) => {
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

    grid.addEventListener("click", (e) => {
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
    });

    dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => {
      // A click landing on the dialog itself is a click outside the
      // content, since the panes fill it.
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    });

    for (const pane of dialog.querySelectorAll<HTMLElement>("[data-zoom]")) makeZoomable(pane);
    sync(0);
  }
}
