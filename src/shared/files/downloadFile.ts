/** Some browsers read the file after the click returns, so the URL is released a little later. */
const REVOKE_DELAY_MS = 10_000;

/** Saves text as a file on the user's device (a download in the browser). */
export function downloadTextFile(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
