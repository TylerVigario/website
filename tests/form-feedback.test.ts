/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { enhance } from "../src/lib/forms/enhance";

/**
 * When the server refuses a submission, the person has to be told why.
 * Every entry in a Problem Details `errors[]` lands somewhere visible:
 * on the control it names, on the group an item belongs to, or in the
 * form-level alert. An error that lands nowhere leaves a re-enabled
 * button and no explanation, which reads as "the form is broken".
 */
function buildForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form>
      <p data-form-error hidden></p>
      <input name="name" />
      <fieldset>
        <input type="checkbox" name="services" value="Linux" />
        <input type="checkbox" name="services" value="Networking" />
      </fieldset>
      <button type="submit">Send</button>
    </form>`;
  return document.querySelector("form")!;
}

async function submitAgainst(errors: { field: string; message: string }[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ status: 422, errors }) }),
    ),
  );
  const form = buildForm();
  enhance({
    form,
    rules: {},
    endpoint: "/api/test",
    arrayFields: ["services"],
    draftKey: "vts:test-feedback",
    onSuccess: () => {},
  });
  form.dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.waitFor(() =>
    expect(form.querySelector("button")!.disabled, "request still in flight").toBe(false),
  );
  return form;
}

const root = (form: HTMLFormElement) => form.querySelector<HTMLElement>("[data-form-error]")!;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("server errors always land somewhere visible", () => {
  it("on the control they name", async () => {
    const form = await submitAgainst([{ field: "name", message: "Enter your name." }]);
    expect(form.querySelector("#name-error")?.textContent).toBe("Enter your name.");
    expect(root(form).hidden).toBe(true);
  });

  it("on the group, for an error about one item in it", async () => {
    const form = await submitAgainst([{ field: "services.0", message: "Pick a listed service." }]);
    expect(form.querySelector("#services-error")?.textContent).toBe("Pick a listed service.");
    expect(form.querySelector('[value="Linux"]')!.getAttribute("aria-invalid")).toBe("true");
  });

  it("in the form alert, for an error that names no control", async () => {
    const form = await submitAgainst([{ field: "(root)", message: "Too many requests." }]);
    expect(root(form).hidden).toBe(false);
    expect(root(form).textContent).toBe("Too many requests.");
  });

  it("both at once, with focus on the control", async () => {
    const form = await submitAgainst([
      { field: "(root)", message: "Also this." },
      { field: "name", message: "Enter your name." },
    ]);
    expect(root(form).textContent).toBe("Also this.");
    expect(form.querySelector("#name-error")?.textContent).toBe("Enter your name.");
    expect(document.activeElement).toBe(form.querySelector('[name="name"]'));
  });
});
