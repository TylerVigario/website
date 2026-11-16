/**
 * Replaces a sent form with its confirmation, which the page rendered
 * into <template data-confirmation="name"> (FormConfirmation.astro), so
 * the words are the ones the no-JS page shows after a send. Focus moves
 * to it: the button that had focus is gone with the form, and focus left
 * on <body> leaves a keyboard or screen-reader user nowhere.
 */
export function showConfirmation(form: HTMLFormElement, name: string): void {
  const template = document.querySelector<HTMLTemplateElement>(
    `template[data-confirmation="${name}"]`,
  );
  const done = template?.content.firstElementChild?.cloneNode(true);
  if (!(done instanceof HTMLElement)) return;
  done.tabIndex = -1;
  form.replaceWith(done);
  done.focus();
}
