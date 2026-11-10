/** Personal cover rules: pure, no React or I/O. Mirrored in `firestore.rules` (`isValidCover`). */

/** Width the photo is scaled down to (covers are shown at most ~240px wide, so this stays sharp on 2x screens). */
export const COVER_TARGET_WIDTH = 400;
/** Tallest cover kept (a 2:3 cover at 400px is 600px; very tall photos are cropped by the layout anyway). */
export const COVER_MAX_HEIGHT = 800;
/** Largest encoded image, so a cover document stays small and quick to read. */
export const COVER_MAX_BYTES = 150_000;
/** Largest data URL accepted by `firestore.rules` (the base64 of `COVER_MAX_BYTES` plus the header and margin). */
export const COVER_MAX_DATA_URL_LENGTH = 220_000;
/** Photos larger than this are refused before decoding (phones take ~5–15 MB photos). */
export const COVER_MAX_FILE_BYTES = 25_000_000;
/** Encoder qualities tried in order until the image fits `COVER_MAX_BYTES`. */
export const COVER_QUALITIES = [0.85, 0.75, 0.65, 0.5, 0.4] as const;

const DATA_URL_PATTERN = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** Size that fits `COVER_TARGET_WIDTH` × `COVER_MAX_HEIGHT`, keeping the aspect ratio and never enlarging. */
export function coverSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, COVER_TARGET_WIDTH / width, COVER_MAX_HEIGHT / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Bytes encoded in a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** A data URL the rules accept: WebP or JPEG, base64, within the size limits. */
export function isValidCoverDataUrl(dataUrl: string): boolean {
  return (
    dataUrl.length <= COVER_MAX_DATA_URL_LENGTH &&
    DATA_URL_PATTERN.test(dataUrl) &&
    dataUrlBytes(dataUrl) <= COVER_MAX_BYTES
  );
}

export type CoverFileError = 'notImage' | 'tooLarge';

/** Checks a chosen file before decoding it. */
export function checkCoverFile(file: { type: string; size: number }): CoverFileError | null {
  if (!file.type.startsWith('image/')) return 'notImage';
  if (file.size > COVER_MAX_FILE_BYTES) return 'tooLarge';
  return null;
}
