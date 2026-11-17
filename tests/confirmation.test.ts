// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { showConfirmation } from "@/lib/forms/confirmation";

/**
 * A form sent with JavaScript is replaced by the confirmation the page
 * rendered into its <template> (FormConfirmation.astro), the same words a
 * no-JS send is shown, and focus moves to it rather than being left on
 * <body> with the button that had it gone.
 */
describe("the confirmation after a JSON send", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form data-test-form><button type="submit">Send</button></form>
      <template data-confirmation="quote">
        <div role="status"><p>Thanks — that's through.</p><p>If it's urgent, call.</p></div>
      </template>`;
  });

  it("replaces the form with the page's own confirmation, and focuses it", () => {
    const form = document.querySelector<HTMLFormElement>("[data-test-form]");
    if (!form) throw new Error("no form");
    showConfirmation(form, "quote");
    expect(document.querySelector("[data-test-form]")).toBeNull();
    const done = document.querySelector('[role="status"]');
    expect(done?.textContent).toBe("Thanks — that's through.If it's urgent, call.");
    expect(document.activeElement).toBe(done);
    // The template stays, so its content was cloned, not moved.
    expect(document.querySelector("template")?.content.childElementCount).toBe(1);
  });

  it("leaves the form alone when the page rendered no confirmation for it", () => {
    const form = document.querySelector<HTMLFormElement>("[data-test-form]");
    if (!form) throw new Error("no form");
    showConfirmation(form, "pots-audit");
    expect(document.querySelector("[data-test-form]")).toBe(form);
  });
});
