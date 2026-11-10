import { hasReviewChanges, isReviewTooLong, normalizeReview, REVIEW_MAX_LENGTH, reviewExcerpt } from './review';

describe('normalizeReview', () => {
  it('trims the ends and unifies line breaks, keeping inner blank lines', () => {
    expect(normalizeReview('\r\n  Loved it.\r\n\r\nWould reread.  \n\n')).toBe('Loved it.\n\nWould reread.');
    expect(normalizeReview('   ')).toBe('');
  });
});

describe('isReviewTooLong', () => {
  it('measures the trimmed text', () => {
    expect(isReviewTooLong(`  ${'a'.repeat(REVIEW_MAX_LENGTH)}  `)).toBe(false);
    expect(isReviewTooLong('a'.repeat(REVIEW_MAX_LENGTH + 1))).toBe(true);
  });
});

describe('hasReviewChanges', () => {
  it('ignores whitespace at the ends only', () => {
    expect(hasReviewChanges('Great. ', 'Great.')).toBe(false);
    expect(hasReviewChanges('Great!', 'Great.')).toBe(true);
    expect(hasReviewChanges('', '')).toBe(false);
  });
});

describe('reviewExcerpt', () => {
  it('keeps a short first paragraph whole', () => {
    expect(reviewExcerpt('Short one.\n\nSecond paragraph.', 50)).toBe('Short one.');
  });

  it('cuts a long paragraph at a word', () => {
    expect(reviewExcerpt('The quick brown fox jumps over the lazy dog', 20)).toBe('The quick brown fox…');
  });

  it('cuts inside a very long word when needed', () => {
    expect(reviewExcerpt('Supercalifragilisticexpialidocious', 10)).toBe('Supercalif…');
  });
});
