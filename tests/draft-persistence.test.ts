/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { enhance } from "../src/lib/forms/enhance";

/**
 * The other half of the never-erase invariant.
 *
 * `never-erase.test.ts` proves nothing destroys input. That is the half
 * a bug would be loud about. This is the quiet half: a draft that never
 * saves, or saves and never comes back, loses exactly as much work — and
 * loses it silently, because the form looks fine both times.
 *
 * The promise is that someone can close the tab mid-form and find their
 * words still there tomorrow. So these tests write into a real form,
 * throw the DOM away, build a fresh one, and check what comes back.
 */

const KEY = "vts:test-draft";

function buildForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form data-test-form>
      <input name="name" />
      <input name="contact" />
      <textarea name="details"></textarea>
      <select name="bill">
        <option value="">Pick a range…</option>
        <option value="Under $100">Under $100</option>
        <option value="$100–$500">$100–$500</option>
      </select>
      <input type="checkbox" name="services" value="Linux" />
      <input type="checkbox" name="services" value="Networking" />
      <button type="submit">Send</button>
    </form>`;
  return document.querySelector("form")!;
}

const mount = (form: HTMLFormElement) =>
  enhance({
    form,
    rules: {},
    endpoint: "/api/test",
    arrayFields: ["services"],
    draftKey: KEY,
    // Required by the contract; these tests never submit, so it only
    // has to exist.
    onSuccess: () => {},
  });

const field = <T extends HTMLElement>(form: HTMLFormElement, name: string) =>
  form.querySelector<T>(`[name="${name}"]`)!;

/** Type into a control the way a person does: set it, then fire input. */
function type(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("a draft survives the tab closing", () => {
  it("saves what was typed", () => {
    const form = buildForm();
    mount(form);
    type(field<HTMLInputElement>(form, "name"), "Dana");
    type(field<HTMLTextAreaElement>(form, "details"), "two lines\nof detail");

    const saved = JSON.parse(localStorage.getItem(KEY)!) as Record<string, unknown>;
    expect(saved.name).toBe("Dana");
    expect(saved.details).toBe("two lines\nof detail");
  });

  it("puts it back into a form that has never seen it", () => {
    const first = buildForm();
    mount(first);
    type(field<HTMLInputElement>(first, "name"), "Dana");
    type(field<HTMLInputElement>(first, "contact"), "dana@example.com");

    // The tab closes. Nothing of the old DOM survives.
    document.body.innerHTML = "";
    const second = buildForm();
    mount(second);

    expect(field<HTMLInputElement>(second, "name").value).toBe("Dana");
    expect(field<HTMLInputElement>(second, "contact").value).toBe("dana@example.com");
  });

  it("restores checkbox groups, not just text", () => {
    const first = buildForm();
    mount(first);
    const linux = first.querySelector<HTMLInputElement>('[value="Linux"]')!;
    linux.checked = true;
    linux.dispatchEvent(new Event("input", { bubbles: true }));

    document.body.innerHTML = "";
    const second = buildForm();
    mount(second);

    expect(second.querySelector<HTMLInputElement>('[value="Linux"]')!.checked).toBe(true);
    expect(second.querySelector<HTMLInputElement>('[value="Networking"]')!.checked).toBe(false);
  });

  it("never overwrites something already typed into the new form", () => {
    const first = buildForm();
    mount(first);
    type(field<HTMLInputElement>(first, "name"), "Saved");

    document.body.innerHTML = "";
    const second = buildForm();
    // Someone starts typing before the restore runs.
    field<HTMLInputElement>(second, "name").value = "Live";
    mount(second);

    expect(
      field<HTMLInputElement>(second, "name").value,
      "a restore clobbered live input — the one thing the guard exists to stop",
    ).toBe("Live");
  });

  it("restores a select", () => {
    const first = buildForm();
    mount(first);
    const bill = field<HTMLSelectElement>(first, "bill");
    bill.value = "$100–$500";
    bill.dispatchEvent(new Event("change", { bubbles: true }));

    document.body.innerHTML = "";
    const second = buildForm();
    mount(second);
    expect(field<HTMLSelectElement>(second, "bill").value).toBe("$100–$500");
  });

  it("leaves a select on its placeholder when the saved choice is no longer offered", () => {
    localStorage.setItem(KEY, JSON.stringify({ bill: "a range that was removed" }));
    const form = buildForm();
    mount(form);
    const bill = field<HTMLSelectElement>(form, "bill");
    expect(bill.value).toBe("");
    expect(bill.selectedIndex, "assigning a missing value selects nothing at all").toBe(0);
  });

  it("never overrides a select already chosen in the new form", () => {
    localStorage.setItem(KEY, JSON.stringify({ bill: "Under $100" }));
    const form = buildForm();
    field<HTMLSelectElement>(form, "bill").value = "$100–$500";
    mount(form);
    expect(field<HTMLSelectElement>(form, "bill").value).toBe("$100–$500");
  });

  it("never unticks or overrides a checkbox group already ticked in the new form", () => {
    // A stale draft, and a page re-rendered by a no-JS round trip with a
    // different choice already ticked. The page is newer than the draft.
    localStorage.setItem(KEY, JSON.stringify({ services: ["Linux"] }));
    const form = buildForm();
    form.querySelector<HTMLInputElement>('[value="Networking"]')!.checked = true;
    mount(form);
    expect(form.querySelector<HTMLInputElement>('[value="Networking"]')!.checked).toBe(true);
    expect(form.querySelector<HTMLInputElement>('[value="Linux"]')!.checked).toBe(false);
  });

  it.each(["null", "42", "[]", '"a string"'])(
    "ignores a stored draft of %s rather than throwing",
    (stored) => {
      localStorage.setItem(KEY, stored);
      const form = buildForm();
      field<HTMLInputElement>(form, "name").value = "Typed";
      expect(() => mount(form)).not.toThrow();
      expect(field<HTMLInputElement>(form, "name").value).toBe("Typed");
    },
  );

  it("survives a corrupt draft without clearing the form", () => {
    localStorage.setItem(KEY, "{not json");
    const form = buildForm();
    field<HTMLInputElement>(form, "name").value = "Typed";
    expect(() => mount(form)).not.toThrow();
    expect(field<HTMLInputElement>(form, "name").value).toBe("Typed");
  });
});
