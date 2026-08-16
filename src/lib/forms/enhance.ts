import type { Rules } from "@/lib/forms/rules";

/**
 * Progressive enhancement for the site's forms.
 *
 * THE RULE THIS FILE EXISTS TO KEEP: nothing here ever writes to an
 * input's value except when restoring a draft the user themselves
 * typed. Errors are sibling nodes created and removed around inputs
 * that are never touched. There is no re-render, no reconciliation and
 * no framework that could throw DOM away, so losing what someone typed
 * is not a bug that can occur — it is a code path that does not exist.
 *
 * Without JavaScript the form still posts and the endpoint re-renders
 * with every value repopulated. This layer makes that experience live
 * rather than replacing it.
 */

type Fields = Record<string, string | string[]>;

/** Read the form into the shape the zod schema expects. */
function read(form: HTMLFormElement, arrayFields: string[]): Fields {
  const data = new FormData(form);
  const out: Fields = {};
  for (const key of new Set(data.keys())) {
    out[key] = arrayFields.includes(key)
      ? data.getAll(key).map(String)
      : typeof data.get(key) === "string"
        ? (data.get(key) as string)
        : "";
  }
  // A checkbox group with nothing ticked contributes no FormData key at
  // all, so the field would be absent rather than empty and the schema
  // would report the wrong error. Name it explicitly.
  for (const key of arrayFields) if (!(key in out)) out[key] = [];
  return out;
}

function controlsFor(form: HTMLFormElement, field: string): HTMLElement[] {
  return Array.from(form.querySelectorAll<HTMLElement>(`[name="${CSS.escape(field)}"]`));
}

/**
 * Show or clear one field's error. The <p> is created and destroyed;
 * the input is only ever annotated.
 */
function setError(form: HTMLFormElement, field: string, message: string | null) {
  const controls = controlsFor(form, field);
  if (controls.length === 0) return;

  const anchor = controls[0];
  const errorId = `${field}-error`;
  const existing = form.querySelector<HTMLElement>(`#${CSS.escape(errorId)}`);

  if (!message) {
    existing?.remove();
    for (const c of controls) {
      c.removeAttribute("aria-invalid");
      c.removeAttribute("aria-describedby");
    }
    return;
  }

  let node = existing;
  if (!node) {
    node = document.createElement("p");
    node.id = errorId;
    // role=alert so the message is announced when it appears, which is
    // the whole point of validating as you go rather than at submit.
    node.setAttribute("role", "alert");
    node.className = "mt-1.5 text-sm text-red-600";
    // Insert after the group wrapper for checkbox groups, after the
    // control otherwise, so it reads in the right order.
    const target = anchor.closest("fieldset") ?? anchor;
    target.parentElement?.insertBefore(node, target.nextSibling);
  }
  node.textContent = message;

  for (const c of controls) {
    c.setAttribute("aria-invalid", "true");
    c.setAttribute("aria-describedby", errorId);
  }
}

export interface EnhanceOptions {
  form: HTMLFormElement;
  rules: Rules;
  endpoint: string;
  /** Fields that are checkbox groups and must be read as arrays. */
  arrayFields?: string[];
  /** localStorage key. Drafts live on the user's machine and are theirs. */
  draftKey: string;
  /** Called on a 2xx, after the draft has been cleared. */
  onSuccess: () => void;
}

export function enhance({
  form,
  rules,
  endpoint,
  arrayFields = [],
  draftKey,
  onSuccess,
}: EnhanceOptions) {
  // ---- draft persistence -------------------------------------------------
  //
  // localStorage, not sessionStorage, deliberately: a draft that dies
  // with the tab fails the case that matters, which is someone coming
  // back tomorrow. Nothing here is transmitted — it is the user's own
  // work, kept on the user's own machine, until they submit or clear it.

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(read(form, arrayFields)));
    } catch {
      // Private mode, quota, storage disabled. A draft is a courtesy;
      // failing to store one must never break the form.
    }
  };

  const restoreDraft = () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(draftKey);
    } catch {
      return;
    }
    if (!raw) return;
    let saved: Fields;
    try {
      saved = JSON.parse(raw) as Fields;
    } catch {
      return;
    }

    for (const [field, value] of Object.entries(saved)) {
      for (const c of controlsFor(form, field)) {
        if (c instanceof HTMLInputElement && c.type === "checkbox") {
          c.checked = Array.isArray(value) && value.includes(c.value);
        } else if (
          (c instanceof HTMLInputElement || c instanceof HTMLTextAreaElement) &&
          typeof value === "string" &&
          // Only fill a control the user has not already typed into, so
          // a restore can never clobber live input.
          c.value === ""
        ) {
          c.value = value;
        }
      }
    }
  };

  // ---- validation --------------------------------------------------------
  //
  // A field is validated once it has been left (blur), and continuously
  // after that. Validating every keystroke from the first character
  // means telling someone their email is invalid while they are still
  // typing the local part, which is nagging rather than helping.

  const touched = new Set<string>();

  const errorsFor = (): Map<string, string> => {
    const values = read(form, arrayFields);
    const map = new Map<string, string>();
    for (const [field, rule] of Object.entries(rules)) {
      const message = rule(values[field] ?? "");
      if (message) map.set(field, message);
    }
    return map;
  };

  const refresh = (only?: string) => {
    const errors = errorsFor();
    const fields = only ? [only] : Array.from(touched);
    for (const field of fields) {
      setError(form, field, touched.has(field) ? (errors.get(field) ?? null) : null);
    }
  };

  form.addEventListener(
    "blur",
    (e) => {
      const el = e.target as HTMLElement;
      const field = el.getAttribute?.("name");
      if (!field) return;
      touched.add(field);
      refresh(field);
    },
    true,
  );

  form.addEventListener("input", (e) => {
    const field = (e.target as HTMLElement).getAttribute?.("name");
    saveDraft();
    if (field && touched.has(field)) refresh(field);
  });

  form.addEventListener("change", (e) => {
    const field = (e.target as HTMLElement).getAttribute?.("name");
    saveDraft();
    if (field) {
      touched.add(field);
      refresh(field);
    }
  });

  // ---- submit ------------------------------------------------------------

  const rootError = (message: string | null) => {
    const node = form.querySelector<HTMLElement>("[data-form-error]");
    if (!node) return;
    node.textContent = message ?? "";
    node.hidden = !message;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void (async () => {
      rootError(null);

      const errors = errorsFor();
      if (errors.size > 0) {
        // Mark everything touched so nothing fails silently, then move
        // focus to the first problem rather than leaving the user to
        // hunt for it.
        for (const field of errors.keys()) touched.add(field);
        refresh();
        const first = controlsFor(form, Array.from(errors.keys())[0])[0];
        first?.focus();
        return;
      }

      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const busy = () => {
        if (submit) submit.disabled = true;
        form.setAttribute("data-submitting", "");
      };
      const idle = () => {
        if (submit) submit.disabled = false;
        form.removeAttribute("data-submitting");
      };

      busy();
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(read(form, arrayFields)),
        });

        if (res.ok) {
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* nothing to do */
          }
          onSuccess();
          return;
        }

        // Server rejected. Map Problem Details back to the fields that
        // caused it. The form is not touched — the user's input stays
        // exactly as they left it and they fix one thing.
        // Read Problem Details by hand. Importing the zod schema here
        // would pull the whole library into the browser to inspect four
        // keys, which is precisely what src/lib/forms/rules.ts exists to
        // avoid. Defensive because it is a network response: anything
        // unexpected falls through to the root message rather than
        // throwing.
        const body: unknown = await res.json().catch(() => null);
        const problem = (body ?? {}) as {
          title?: unknown;
          detail?: unknown;
          errors?: unknown;
        };
        const fieldErrors = Array.isArray(problem.errors)
          ? (problem.errors as unknown[]).filter(
              (e): e is { field: string; message: string } =>
                !!e &&
                typeof e === "object" &&
                typeof (e as { field?: unknown }).field === "string" &&
                typeof (e as { message?: unknown }).message === "string",
            )
          : [];

        if (fieldErrors.length > 0) {
          for (const { field, message } of fieldErrors) {
            touched.add(field);
            setError(form, field, message);
          }
          const first = controlsFor(form, fieldErrors[0].field)[0];
          first?.focus();
        } else {
          const fallback =
            typeof problem.detail === "string"
              ? problem.detail
              : typeof problem.title === "string"
                ? problem.title
                : "Something went wrong sending that. Your details are still here — please try again.";
          rootError(fallback);
        }
      } catch {
        rootError(
          "Could not reach the server. Nothing was lost — your details are still here, try again in a moment.",
        );
      } finally {
        idle();
      }
    })();
  });

  restoreDraft();
}
