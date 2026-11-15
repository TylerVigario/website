/**
 * Enhances PotsAuditForm.astro's form with enhance.ts. The form works without
 * it, as a plain HTML post.
 */
import { potsAuditRules } from "@/lib/forms/rules";
import { enhance } from "@/lib/forms/enhance";
import { showConfirmation } from "@/lib/forms/confirmation";

const form = document.querySelector<HTMLFormElement>("[data-pots-form]");
if (form) {
  enhance({
    form,
    rules: potsAuditRules,
    endpoint: "/api/pots-audit",
    draftKey: "vts:pots-audit-draft",
    onSuccess: () => showConfirmation(form, "pots-audit"),
  });
}
