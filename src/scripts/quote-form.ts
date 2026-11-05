/**
 * Enhances QuoteForm.astro's form with enhance.ts. The form works without
 * it, as a plain HTML post.
 */
import { quoteRules } from "@/lib/forms/rules";
import { enhance } from "@/lib/forms/enhance";

const form = document.querySelector<HTMLFormElement>("[data-quote-form]");
if (form) {
  enhance({
    form,
    rules: quoteRules,
    endpoint: "/api/quote",
    arrayFields: ["services"],
    draftKey: "vts:quote-draft",
    onSuccess: () => {
      // Replace the form with the confirmation rather than navigating,
      // so nothing else on the page is disturbed.
      const done = document.createElement("div");
      done.setAttribute("role", "status");
      done.className = "rounded-lg border border-border bg-surface-light p-6";
      done.innerHTML =
        '<p class="font-medium text-foreground">Thanks — that\'s through.</p>' +
        '<p class="mt-1 text-sm text-muted">We\'ll get back to you shortly.</p>';
      // Focus moves to the confirmation: the button that had it is gone
      // with the form, and focus left on <body> leaves a keyboard or
      // screen-reader user nowhere.
      done.tabIndex = -1;
      form.replaceWith(done);
      done.focus();
    },
  });
}
