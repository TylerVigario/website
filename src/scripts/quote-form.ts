/**
 * Enhances QuoteForm.astro's form with enhance.ts. The form works without
 * it, as a plain HTML post.
 */
import { quoteRules } from "@/lib/forms/rules";
import { enhance } from "@/lib/forms/enhance";
import { showConfirmation } from "@/lib/forms/confirmation";

const form = document.querySelector<HTMLFormElement>("[data-quote-form]");
if (form) {
  enhance({
    form,
    rules: quoteRules,
    endpoint: "/api/quote",
    arrayFields: ["services"],
    draftKey: "vts:quote-draft",
    onSuccess: () => showConfirmation(form, "quote"),
  });
}
