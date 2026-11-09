import {
  asRecord,
  nonEmptyString,
  normalizeIsbn,
  positiveInteger,
  secureUrl,
  stringList,
  toPlainText,
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

  it('toPlainText strips tags and collapses whitespace', () => {
    expect(toPlainText('<p>A <b>great</b>\n book.</p>')).toBe('A great book.');
    expect(toPlainText('<br/>')).toBeNull();
    expect(toPlainText(null)).toBeNull();
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

  it('secureUrl upgrades http links', () => {
    expect(secureUrl('http://books.google.com/x')).toBe('https://books.google.com/x');
    expect(secureUrl('https://a/b')).toBe('https://a/b');
    expect(secureUrl('')).toBeNull();
  });
});
