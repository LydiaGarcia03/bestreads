import { compactName, isRecommendable } from './recommendationRules';

describe('compactName', () => {
  it('ignores case, accents, spaces and punctuation', () => {
    expect(compactName('J. K. Rowling')).toBe('jkrowling');
    expect(compactName('JK ROWLING')).toBe('jkrowling');
    expect(compactName('José Saramago')).toBe('josesaramago');
  });
});

describe('isRecommendable', () => {
  it.each(['J. K. Rowling', 'J.K. Rowling', 'JK Rowling', 'j k rowling', 'Joanne Rowling', 'Robert Galbraith'])(
    'excludes books by %s',
    (author) => {
      expect(isRecommendable({ authors: [author] })).toBe(false);
      expect(isRecommendable({ authors: ['Someone Else', author] })).toBe(false);
    },
  );

  it('keeps other authors, including books without authors', () => {
    expect(isRecommendable({ authors: ['James Clear'] })).toBe(true);
    expect(isRecommendable({ authors: ['Rowling Smith'] })).toBe(true);
    expect(isRecommendable({ authors: [] })).toBe(true);
  });
});
