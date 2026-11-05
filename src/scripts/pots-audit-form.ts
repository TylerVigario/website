/**
 * Enhances PotsAuditForm.astro's form with enhance.ts. The form works without
 * it, as a plain HTML post.
 */
import { potsAuditRules } from "@/lib/forms/rules";
import { enhance } from "@/lib/forms/enhance";

const form = document.querySelector<HTMLFormElement>("[data-pots-form]");
if (form) {
  enhance({
    form,
    rules: potsAuditRules,
    endpoint: "/api/pots-audit",
    draftKey: "vts:pots-audit-draft",
    onSuccess: () => {
      const done = document.createElement("div");
      done.setAttribute("role", "status");
      done.className = "rounded-lg border border-border bg-surface-light p-6";
      done.innerHTML =
        '<p class="font-medium text-foreground">Got it — we\'ll take a look.</p>' +
        '<p class="mt-1 text-sm text-muted">We\'ll come back with what your lines actually cost.</p>';
      // Focus moves to the confirmation: the button that had it is gone
      // with the form, and focus left on <body> leaves a keyboard or
      // screen-reader user nowhere.
      done.tabIndex = -1;
      form.replaceWith(done);
      done.focus();
    },
  });
}
