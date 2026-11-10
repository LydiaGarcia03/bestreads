import {
  asRecord,
  nonEmptyString,
  normalizeIsbn,
  normalizePublishedDate,
  positiveInteger,
  secureUrl,
  stringList,
  toDescriptionText,
  topCategories,
  yearFromDate,
} from './bookData';

describe('bookData helpers', () => {
  it('asRecord treats non-objects as empty', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toEqual({});
    expect(asRecord('x')).toEqual({});
  });

  it('nonEmptyString trims and rejects blanks and non-strings', () => {
    expect(nonEmptyString('  Dune ')).toBe('Dune');
    expect(nonEmptyString('   ')).toBeNull();
    expect(nonEmptyString(3)).toBeNull();
  });

  it('positiveInteger accepts only whole numbers above zero', () => {
    expect(positiveInteger(320)).toBe(320);
    expect(positiveInteger(0)).toBeNull();
    expect(positiveInteger(-5)).toBeNull();
    expect(positiveInteger(12.5)).toBeNull();
    expect(positiveInteger('320')).toBeNull();
  });

  it('stringList keeps non-empty strings', () => {
    expect(stringList(['Ann', ' ', 3, ' Bo '])).toEqual(['Ann', 'Bo']);
    expect(stringList('Ann')).toEqual([]);
  });

  it.each([
    ['2021-05-04', 2021],
    ['2021-05', 2021],
    ['1965', 1965],
    [1965, 1965],
    ['circa 1900', null],
    [undefined, null],
  ])('yearFromDate(%s) is %s', (input, year) => {
    expect(yearFromDate(input)).toBe(year);
  });

  describe('toDescriptionText', () => {
    it('turns HTML emphasis and paragraphs into the Markdown subset', () => {
      expect(toDescriptionText('<p>A <b>great</b> <i>space</i> book.</p><p>Line one<br>line two</p>')).toBe(
        'A **great** *space* book.\n\nLine one\nline two',
      );
      expect(toDescriptionText('<strong><em>Both</em></strong>')).toBe('***Both***');
    });

    it('keeps Markdown emphasis and drops link targets', () => {
      expect(toDescriptionText("***'My name is Natalie'*** see [the site](https://x.y)")).toBe(
        "***'My name is Natalie'*** see the site",
      );
    });

    it('removes other tags, decodes entities and tidies whitespace', () => {
      expect(toDescriptionText('<span>Tom &amp; Jerry&#39;s &quot;tale&quot;&nbsp;&#x2014;  ok</span>')).toBe(
        'Tom & Jerry\'s "tale" — ok',
      );
      expect(toDescriptionText('a\r\n\r\n\r\n\r\nb')).toBe('a\n\nb');
      expect(toDescriptionText('&unknown; &#99999999;')).toBe('&unknown; &#99999999;');
    });

    it('is null for empty content', () => {
      expect(toDescriptionText('<br/>')).toBeNull();
      expect(toDescriptionText(null)).toBeNull();
    });
  });

  it.each([
    ['978-0-593-13520-4', '9780593135204'],
    ['0 553 41802 x', '055341802X'],
    ['12345', null],
    ['97805931352041', null],
    [9780593135204, null],
  ])('normalizeIsbn(%s) is %s', (input, isbn) => {
    expect(normalizeIsbn(input)).toBe(isbn);
  });

  it.each([
    ['2021-05-04', '2021-05-04'],
    ['2021-05', '2021-05'],
    ['2021', '2021'],
    [2021, '2021'],
    ['2021-13-01', '2021'],
    ['2021-05-40', '2021-05'],
    ['2021-05-04T10:00:00Z', '2021-05-04'],
    ['May 2021', null],
    [null, null],
  ])('normalizePublishedDate(%s) is %s', (input, date) => {
    expect(normalizePublishedDate(input)).toBe(date);
  });

  it('topCategories splits hierarchies, drops filler and duplicates, and keeps three', () => {
    expect(topCategories(['Fiction / Science Fiction / General', 'fiction', 'Space', 'Survival'])).toEqual([
      'Fiction',
      'Science Fiction',
      'Space',
    ]);
    expect(topCategories(['General', ' '])).toEqual([]);
  });

  it('secureUrl upgrades http links', () => {
    expect(secureUrl('http://books.google.com/x')).toBe('https://books.google.com/x');
    expect(secureUrl('https://a/b')).toBe('https://a/b');
    expect(secureUrl('')).toBeNull();
  });
});
