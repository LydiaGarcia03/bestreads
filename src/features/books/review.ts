/** Private review rules: pure, no React or I/O. Mirrored in `firestore.rules` (`isValidReview`). */

/** Longest review stored (about 3,000 words). */
export const REVIEW_MAX_LENGTH = 20_000;

/** The owner's review, kept in `users/{uid}/books/{bookId}/private/review` and never copied to `public/`. */
export interface Review {
  text: string;
  updatedAt: Date | null;
}

/** Trailing spaces and blank lines at the ends are dropped; an empty review means "no review". */
export function normalizeReview(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

export function isReviewTooLong(text: string): boolean {
  return normalizeReview(text).length > REVIEW_MAX_LENGTH;
}

/** Whether `draft` would change the saved review (ignoring whitespace at the ends). */
export function hasReviewChanges(draft: string, saved: string): boolean {
  return normalizeReview(draft) !== normalizeReview(saved);
}

/** The first paragraph, shortened to `maxLength` characters, for a collapsed preview. */
export function reviewExcerpt(text: string, maxLength: number): string {
  const firstParagraph = normalizeReview(text).split(/\n\s*\n/)[0] ?? '';
  if (firstParagraph.length <= maxLength) return firstParagraph;
  const cut = firstParagraph.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
