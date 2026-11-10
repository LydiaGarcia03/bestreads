/**
 * Turns a chosen photo into a small cover data URL, in the browser (no upload service on the Spark plan).
 * Browser I/O only (image decoding, canvas); the rules are in `personalCover.ts`.
 */
import { COVER_MAX_BYTES, COVER_QUALITIES, coverSize, dataUrlBytes, isValidCoverDataUrl } from './personalCover';

export type CoverImageErrorReason = 'unreadable' | 'tooBig';

export class CoverImageError extends Error {
  constructor(
    readonly reason: CoverImageErrorReason,
    options?: ErrorOptions,
  ) {
    super(`Cover image ${reason}`, options);
    this.name = 'CoverImageError';
  }
}

/** WebP is smallest; browsers that can't encode it (older Safari) silently return PNG, so JPEG is next. */
const FORMATS = ['image/webp', 'image/jpeg'] as const;

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    // `from-image` applies the photo's EXIF rotation, so phone pictures aren't sideways.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    throw new CoverImageError('unreadable', { cause: error });
  }
}

/**
 * Scales the photo to fit 400 × 800 px and encodes it as WebP (or JPEG), lowering the quality until it
 * fits ~150 KB. Rejects with `CoverImageError` when the file can't be read or can't be made small enough.
 */
export async function resizeCoverImage(file: Blob): Promise<string> {
  const bitmap = await decode(file);
  const { width, height } = coverSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new CoverImageError('unreadable');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const format of FORMATS) {
    for (const quality of COVER_QUALITIES) {
      const dataUrl = canvas.toDataURL(format, quality);
      if (!dataUrl.startsWith(`data:${format};`)) break; // This browser can't encode the format.
      if (dataUrlBytes(dataUrl) <= COVER_MAX_BYTES && isValidCoverDataUrl(dataUrl)) return dataUrl;
    }
  }
  throw new CoverImageError('tooBig');
}
