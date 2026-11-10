/**
 * Share cards' I/O: the only module touching `html-to-image` (loaded on demand), `fetch` for covers,
 * the Web Share API and file downloads. Mocked in tests.
 */
import { CARD_PIXEL_RATIO } from './shareMethod';

/** A 1×1 transparent PNG, drawn instead of any image that fails to load while rendering. */
const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** Renders `node` as a PNG (heavy library loaded only now). */
export async function renderPng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(node, { pixelRatio: CARD_PIXEL_RATIO, imagePlaceholder: TRANSPARENT_PIXEL });
  if (!blob) throw new Error('The card could not be rendered');
  return blob;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unreadable')));
    reader.onerror = () => reject(reader.error ?? new Error('Unreadable'));
    reader.readAsDataURL(blob);
  });
}

/**
 * A cover as a data URL, so the card renders exactly as previewed; `null` when the image host
 * doesn't allow reading it from the browser (no CORS), and the card uses its placeholder instead.
 */
export async function loadShareableImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.type.startsWith('image/') ? await readAsDataUrl(blob) : null;
  } catch {
    // Network or CORS failure: expected for some cover hosts; the placeholder is used.
    return null;
  }
}

export function canShareFiles(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Opens the share sheet. Resolves `false` when the user closes it without sharing. */
export async function shareFile(file: File, title: string): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the download start before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
