/**
 * One-shot scroll reveal.
 *
 * Arms the effect from script, so the stylesheet never hides anything on
 * its own — if this file fails to load or throws, every element stays
 * opaque and the page is simply un-animated. Once shown, an element is
 * unobserved and never re-hidden, so scrolling back cannot fade text out
 * from under a reader. Those are the two ways the previous attempts
 * failed; both are structurally impossible here.
 */
const els = document.querySelectorAll<HTMLElement>("[data-reveal]");

if (els.length > 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.removeAttribute("data-reveal-armed");
        el.setAttribute("data-reveal-shown", "");
        io.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );

  for (const el of els) {
    // Anything already on screen at load is shown outright rather than
    // animated, so nothing above the fold flickers on first paint.
    if (el.getBoundingClientRect().top < innerHeight) {
      el.setAttribute("data-reveal-shown", "");
      continue;
    }
    el.setAttribute("data-reveal-armed", "");
    io.observe(el);
  }
}
