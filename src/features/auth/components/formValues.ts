/** Reads a text field from a submitted form. */
export function readTextField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}
