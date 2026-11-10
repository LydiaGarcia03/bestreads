import { createTestBook } from '@/test/fakes';
import { numberSeriesByRelease } from './seriesOrder';
import type { BookSeries } from './types';

const book = (id: string, title: string, year: number | null, series: BookSeries | null) =>
  createTestBook({ id, title, publishedYear: year, series });

const hungerGames = (position: string | null = null) => ({ name: 'The Hunger Games', position });

describe('numberSeriesByRelease', () => {
  it('numbers a series without positions by release year, keeping the list order', () => {
    const books = numberSeriesByRelease([
      book('a', 'The Hunger Games', 2008, hungerGames()),
      book('b', 'Mockingjay', 2010, { name: 'Hunger Games', position: null }),
      book('c', 'Catching Fire', 2009, hungerGames()),
      book('d', 'Dune', 1965, { name: 'Dune', position: '1' }),
      book('e', 'Circe', 2018, null),
    ]);

    expect(books.map((result) => `${result.title} ${result.series?.position ?? '-'}`)).toEqual([
      'The Hunger Games 1',
      'Mockingjay 3',
      'Catching Fire 2',
      'Dune 1',
      'Circe -',
    ]);
  });

  it('leaves a lone book of a series unnumbered (it might be a sequel)', () => {
    const [mockingjay] = numberSeriesByRelease([book('b', 'Mockingjay', 2010, hungerGames())]);
    expect(mockingjay?.series?.position).toBeNull();
  });

  it('leaves series alone when some book has an API position or no year', () => {
    const mixed = numberSeriesByRelease([
      book('a', 'One', 2001, { name: 'Saga', position: '1' }),
      book('b', 'Two', 2002, { name: 'Saga', position: null }),
    ]);
    expect(mixed.map((result) => result.series?.position)).toEqual(['1', null]);

    const undated = numberSeriesByRelease([
      book('a', 'One', 2001, { name: 'Saga', position: null }),
      book('b', 'Two', null, { name: 'Saga', position: null }),
    ]);
    expect(undated.map((result) => result.series?.position)).toEqual([null, null]);
  });

  it('never numbers box sets', () => {
    const books = numberSeriesByRelease([
      book('a', 'The Hunger Games', 2008, hungerGames()),
      book('t', 'The Hunger Games Trilogy', 2009, hungerGames()),
      book('c', 'Catching Fire', 2009, hungerGames()),
    ]);
    expect(books.map((result) => `${result.title} ${result.series?.position ?? '-'}`)).toEqual([
      'The Hunger Games 1',
      'The Hunger Games Trilogy -',
      'Catching Fire 2',
    ]);
  });

  it('breaks same-year ties by title', () => {
    const books = numberSeriesByRelease([
      book('b', 'Beta', 2001, { name: 'Saga', position: null }),
      book('a', 'Alpha', 2001, { name: 'Saga', position: null }),
    ]);
    expect(books.map((result) => `${result.title} ${result.series?.position}`)).toEqual(['Beta 2', 'Alpha 1']);
  });
});
