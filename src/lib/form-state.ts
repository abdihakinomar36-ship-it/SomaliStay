"use client";

/**
 * Preserves unsubmitted form data when the visitor switches languages.
 * Before navigating to the other locale, we snapshot every form on the page
 * (keyed by the page path without the locale prefix). After the new page
 * mounts, the values are restored. Works for both uncontrolled and
 * React-controlled inputs.
 */

const KEY_PREFIX = "somalistay-formstate:";

type SavedField = {
  id: string;
  name: string;
  type: string;
  value: string;
  checked: boolean;
};

export function stripLocaleFromPath(pathname: string): string {
  return pathname.replace(/^\/(en|so)(?=\/|$)/, "") || "/";
}

export function captureAndSaveFormState(pathname: string): void {
  try {
    const fields: SavedField[] = [];
    document.querySelectorAll("input, select, textarea").forEach((el) => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const type = "type" in input ? input.type : "";
      if (type === "password" || type === "file" || input.closest("[data-no-preserve]")) return;
      if (!input.name && !input.id) return;
      fields.push({
        id: input.id,
        name: input.name ?? "",
        type: type,
        value: input.value,
        checked: (input as HTMLInputElement).checked ?? false,
      });
    });
    sessionStorage.setItem(KEY_PREFIX + stripLocaleFromPath(pathname), JSON.stringify(fields));
  } catch {
    // sessionStorage unavailable — switching still works, just without restore.
  }
}

export function restoreFormState(pathname: string): void {
  try {
    const key = KEY_PREFIX + stripLocaleFromPath(pathname);
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    sessionStorage.removeItem(key);
    const fields: SavedField[] = JSON.parse(raw);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      "value"
    )?.set;

    fields.forEach((f) => {
      const el =
        (f.id && document.getElementById(f.id)) ||
        (f.name && document.querySelector(`[name="${CSS.escape(f.name)}"]`));
      if (!el) return;
      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = f.checked;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
        nativeInputValueSetter?.call(el, f.value);
      } else if (el instanceof HTMLTextAreaElement) {
        nativeTextAreaValueSetter?.call(el, f.value);
      } else if (el instanceof HTMLSelectElement) {
        nativeSelectValueSetter?.call(el, f.value);
      } else {
        return;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  } catch {
    // Best effort only.
  }
}
