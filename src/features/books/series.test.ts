import {
  distinctSeriesNames,
  isSameSeries,
  normalizeSeriesName,
  parseSeriesInput,
  parseVolume,
  SERIES_LIMITS,
  seriesFromCatalog,
} from './series';

describe('parseVolume', () => {
  it.each([
    ['1', 1],
    ['2.5', 2.5],
    ['#3', 3],
    [' 0 ', 0],
    ['1-7', null],
    ['Book one', null],
    ['', null],
    [null, null],
    ['1001', null],
  ])('%j → %j', (position, volume) => {
    expect(parseVolume(position)).toBe(volume);
  });
});

describe('series names', () => {
  it('normalizes spaces and compares ignoring case, accents and a leading "The"', () => {
    expect(normalizeSeriesName('  The   Hunger  Games ')).toBe('The Hunger Games');
    expect(isSameSeries('The Hunger Games', 'hunger games')).toBe(true);
    expect(isSameSeries('Crônicas', 'cronicas')).toBe(true);
    expect(isSameSeries('Dune', 'Legends of Dune')).toBe(false);
  });

  it('keeps one spelling per series, sorted', () => {
    expect(distinctSeriesNames(['Dune', 'The Hunger Games', 'dune', ' ', 'Hunger Games'])).toEqual([
      'Dune',
      'The Hunger Games',
    ]);
  });
});

describe('seriesFromCatalog', () => {
  it('reads the catalog series and its position', () => {
    expect(seriesFromCatalog({ name: 'Dune', position: '1' })).toEqual({ name: 'Dune', volume: 1 });
    expect(seriesFromCatalog({ name: 'Harry Potter', position: '1-7' })).toEqual({ name: 'Harry Potter', volume: null });
    expect(seriesFromCatalog({ name: 'x'.repeat(150), position: null })?.name).toHaveLength(SERIES_LIMITS.name);
    expect(seriesFromCatalog({ name: '  ', position: '1' })).toBeNull();
    expect(seriesFromCatalog(null)).toBeNull();
  });
});

describe('parseSeriesInput', () => {
  it('accepts a name with or without a volume, decimals with dot or comma', () => {
    expect(parseSeriesInput(' Dune ', '3')).toEqual({ ok: true, series: { name: 'Dune', volume: 3 } });
    expect(parseSeriesInput('Dune', '')).toEqual({ ok: true, series: { name: 'Dune', volume: null } });
    expect(parseSeriesInput('Discworld', '2,5')).toEqual({ ok: true, series: { name: 'Discworld', volume: 2.5 } });
  });

  it('treats an empty name as no series', () => {
    expect(parseSeriesInput('  ', '4')).toEqual({ ok: true, series: null });
  });

  it('rejects long names and invalid volumes', () => {
    expect(parseSeriesInput('x'.repeat(101), '')).toEqual({ ok: false, error: 'nameTooLong' });
    expect(parseSeriesInput('Dune', 'one')).toEqual({ ok: false, error: 'invalidVolume' });
    expect(parseSeriesInput('Dune', '-1')).toEqual({ ok: false, error: 'invalidVolume' });
    expect(parseSeriesInput('Dune', '5000')).toEqual({ ok: false, error: 'invalidVolume' });
  });
});
