import { createTestBook } from '@/test/fakes';
import { fillMissingCovers, uniqueById } from './catalogResults';

describe('fillMissingCovers', () => {
  it('uses the Open Library ISBN cover when a book has none', () => {
    const [book] = fillMissingCovers([createTestBook({ coverUrl: null, isbn: '9780593135204' })]);
    expect(book?.coverUrl).toBe('https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg?default=false');
  });

  it('keeps existing covers and books without ISBN unchanged', () => {
    const withCover = createTestBook();
    const withoutIsbn = createTestBook({ id: 'b', coverUrl: null, isbn: null });
    expect(fillMissingCovers([withCover, withoutIsbn])).toEqual([withCover, withoutIsbn]);
  });
});

describe('uniqueById', () => {
  it('keeps the first book for each id', () => {
    const first = createTestBook({ id: 'a', title: 'First' });
    const results = uniqueById([first, createTestBook({ id: 'b' }), createTestBook({ id: 'a', title: 'Again' })]);
    expect(results.map((book) => book.title)).toEqual(['First', 'Project Hail Mary']);
    expect(results[0]).toBe(first);
  });
});
