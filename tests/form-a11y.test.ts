/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { enhance } from "../src/lib/forms/enhance";

/**
 * What a screen reader is told about a field. The hint belongs in
 * aria-describedby whether or not there is an error, and a checkbox group
 * is one answer, judged when focus leaves the group.
 */
function mount() {
  document.body.innerHTML = `
    <form>
      <p id="contact-hint">Phone or email.</p>
      <input name="contact" aria-describedby="contact-hint" />
      <fieldset>
        <input type="checkbox" name="services" value="A" />
        <input type="checkbox" name="services" value="B" />
      </fieldset>
      <input name="after" />
    </form>`;
  const form = document.querySelector("form")!;
  enhance({
    form,
    rules: {
      contact: (v) =>
        typeof v === "string" && v.trim() ? null : "Please enter a phone number or email.",
      services: (v) => (Array.isArray(v) && v.length ? null : "Pick at least one service."),
    },
    endpoint: "/api/test",
    arrayFields: ["services"],
    draftKey: "vts:test-a11y",
    onSuccess: () => {},
  });
  return form;
}
const blur = (el: Element, to: Element | null = null) =>
  el.dispatchEvent(new FocusEvent("blur", { relatedTarget: to }));
const type = (el: HTMLInputElement, text: string) => {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

beforeEach(() => localStorage.clear());

describe("a field's description", () => {
  it("keeps the hint when a valid field is left", () => {
    const form = mount();
    const contact = form.querySelector<HTMLInputElement>('[name="contact"]')!;
    type(contact, "dana@example.com");
    blur(contact);
    expect(contact.getAttribute("aria-describedby")).toBe("contact-hint");
  });

  it("adds the error to the hint, error first, and takes only the error away", () => {
    const form = mount();
    const contact = form.querySelector<HTMLInputElement>('[name="contact"]')!;
    blur(contact);
    expect(contact.getAttribute("aria-describedby")).toBe("contact-error contact-hint");
    type(contact, "dana@example.com");
    expect(contact.getAttribute("aria-describedby")).toBe("contact-hint");
  });
});

describe("a checkbox group", () => {
  it("says nothing while focus moves between its boxes", () => {
    const form = mount();
    const [a, b] = form.querySelectorAll<HTMLInputElement>('[name="services"]');
    blur(a, b);
    expect(form.querySelector("#services-error")).toBeNull();
  });

  it("is judged when focus leaves the group", () => {
    const form = mount();
    const [, b] = form.querySelectorAll<HTMLInputElement>('[name="services"]');
    blur(b, form.querySelector('[name="after"]'));
    expect(form.querySelector("#services-error")?.textContent).toBe("Pick at least one service.");
  });
});
