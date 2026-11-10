/** How a share card leaves the app: pure, no React or I/O. */

export type ShareMethod = 'share' | 'download';

/** Card size in CSS pixels (9:16, like a story); rendered at `CARD_PIXEL_RATIO` for 1080 × 1920. */
export const CARD_SIZE = { width: 360, height: 640 } as const;
export const CARD_PIXEL_RATIO = 3;

/** Phones use the share sheet when it accepts files; desktops (or no file sharing) download a PNG. */
export function chooseShareMethod({ isDesktop, canShareFiles }: { isDesktop: boolean; canShareFiles: boolean }): ShareMethod {
  return !isDesktop && canShareFiles ? 'share' : 'download';
}

const MAX_SLUG_LENGTH = 40;

/** `bestreads-<slug>.png` from any text (accents dropped, lowercase, dashes). */
export function shareFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug ? `bestreads-${slug}.png` : 'bestreads.png';
}
