import { createTestBook, createTestLibraryBook } from '@/test/fakes';
import { buildSeriesTimeline, summarizeSeries } from './seriesTimeline';

const owned = (id: string, title: string, volume: number | null, status: 'read' | 'reading' | 'wantToRead') =>
  createTestLibraryBook({ id, title, status, series: { name: 'Dune', volume }, pageCount: 400, publishedYear: 1960 + (volume ?? 30) });

const catalog = (id: string, title: string, position: string | null, year: number, series = 'Dune') =>
  createTestBook({ id, title, series: { name: series, position }, publishedYear: year });

describe('buildSeriesTimeline', () => {
  it('joins owned books and missing catalog volumes in reading order, with their states', () => {
    const timeline = buildSeriesTimeline(
      'Dune',
      [
        { ...owned('my-3', 'Children of Dune', 3, 'reading'), progress: { unit: 'pages', value: 100 } },
        owned('my-1', 'Dune', 1, 'read'),
      ],
      [
        catalog('ol-1', 'Dune', '1', 1965),
        catalog('ol-2', 'Dune Messiah', '2', 1969),
        catalog('ol-3', 'Children of Dune', '3', 1976),
        catalog('ol-4', 'God Emperor of Dune', '4', 1981),
        catalog('ol-box', 'Dune Trilogy', '1-3', 1980),
        catalog('ol-x', 'The Butlerian Jihad', '1', 2002, 'Legends of Dune'),
      ],
    );

    expect(timeline.map((volume) => `${volume.volume} ${volume.title} ${volume.state}`)).toEqual([
      '1 Dune read',
      '2 Dune Messiah notInLibrary',
      '3 Children of Dune reading',
      '4 God Emperor of Dune notInLibrary',
    ]);
    expect(timeline[2]?.percent).toBe(25);
    expect(timeline[0]?.bookId).toBe('my-1');
    expect(timeline[1]?.catalogBook?.id).toBe('ol-2');
  });

  it('matches owned books by title when they have no volume, and skips catalog repeats', () => {
    const timeline = buildSeriesTimeline(
      'The Dune',
      [owned('my-x', 'Dune Messiah', null, 'wantToRead')],
      [catalog('ol-2', 'Dune Messiah', '2', 1969), catalog('ol-2b', 'Dune Messiah (Deluxe)', '2', 2019)],
    );
    expect(timeline.map((volume) => `${volume.bookId} ${volume.state}`)).toEqual(['my-x unread']);
  });

  it('puts volumes without a number last, by year', () => {
    const timeline = buildSeriesTimeline('Dune', [], [catalog('b', 'Later', null, 2000), catalog('a', 'Earlier', null, 1990), catalog('c', 'One', '1', 2010)]);
    expect(timeline.map((volume) => volume.title)).toEqual(['One', 'Earlier', 'Later']);
  });
});

describe('summarizeSeries', () => {
  it('counts read, reading and the rest', () => {
    const timeline = buildSeriesTimeline(
      'Dune',
      [owned('a', 'Dune', 1, 'read'), owned('b', 'Dune Messiah', 2, 'read'), owned('c', 'Children of Dune', 3, 'reading')],
      [catalog('d', 'God Emperor of Dune', '4', 1981), catalog('e', 'Heretics of Dune', '5', 1984)],
    );
    expect(summarizeSeries(timeline)).toEqual({ read: 2, reading: 1, toGo: 2, total: 5 });
  });
});
