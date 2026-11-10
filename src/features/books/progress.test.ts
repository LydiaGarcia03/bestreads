import { isProgressComplete, parseProgressInput, progressIn, progressPercent } from './progress';

const pages = (value: number) => ({ unit: 'pages' as const, value });
const percent = (value: number) => ({ unit: 'percent' as const, value });

describe('progressPercent', () => {
  it('converts pages with the page count, rounding down', () => {
    expect(progressPercent(pages(111), 444)).toBe(25);
    expect(progressPercent(pages(443), 444)).toBe(99);
    expect(progressPercent(pages(444), 444)).toBe(100);
  });

  it('caps pages beyond the count at 100', () => {
    expect(progressPercent(pages(500), 444)).toBe(100);
  });

  it('uses a percentage as is', () => {
    expect(progressPercent(percent(42), null)).toBe(42);
  });

  it('is unknown without progress, or for pages without a page count', () => {
    expect(progressPercent(null, 444)).toBeNull();
    expect(progressPercent(pages(10), null)).toBeNull();
  });

  it('tells when the book is finished', () => {
    expect(isProgressComplete(pages(444), 444)).toBe(true);
    expect(isProgressComplete(percent(100), null)).toBe(true);
    expect(isProgressComplete(percent(99), null)).toBe(false);
    expect(isProgressComplete(null, 444)).toBe(false);
  });
});

describe('progressIn', () => {
  it('converts between pages and percent when the page count is known', () => {
    expect(progressIn('percent', pages(111), 444)).toBe(25);
    expect(progressIn('pages', percent(25), 444)).toBe(111);
    expect(progressIn('pages', pages(111), 444)).toBe(111);
  });

  it('is unknown without progress or page count', () => {
    expect(progressIn('pages', null, 444)).toBeNull();
    expect(progressIn('pages', percent(25), null)).toBeNull();
  });
});

describe('parseProgressInput', () => {
  it('accepts whole numbers within the limits', () => {
    expect(parseProgressInput('pages', ' 120 ', 444)).toEqual({ ok: true, progress: pages(120) });
    expect(parseProgressInput('pages', '0', 444)).toEqual({ ok: true, progress: pages(0) });
    expect(parseProgressInput('pages', '9000', null)).toEqual({ ok: true, progress: pages(9000) });
    expect(parseProgressInput('percent', '100', null)).toEqual({ ok: true, progress: percent(100) });
  });

  it.each([['', 'invalid'], ['abc', 'invalid'], ['-3', 'invalid'], ['12.5', 'invalid']])(
    'rejects %j',
    (raw, error) => {
      expect(parseProgressInput('pages', raw, 444)).toEqual({ ok: false, error });
    },
  );

  it('rejects values beyond the end', () => {
    expect(parseProgressInput('pages', '445', 444)).toEqual({ ok: false, error: 'overPages' });
    expect(parseProgressInput('percent', '101', 444)).toEqual({ ok: false, error: 'overPercent' });
  });
});
