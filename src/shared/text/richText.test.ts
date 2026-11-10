import { parseRichText, richTextToPlain } from './richText';

const run = (text: string, bold = false, italic = false) => ({ text, bold, italic });

describe('parseRichText', () => {
  it('reads bold, italic and both', () => {
    expect(parseRichText("***'My name is Natalie'*** lives a **traditional** *lifestyle*")).toEqual([
      [run("'My name is Natalie'", true, true), run(' lives a '), run('traditional', true), run(' '), run('lifestyle', false, true)],
    ]);
  });

  it('reads underscore emphasis but not underscores inside words', () => {
    expect(parseRichText('a _quiet_ __loud__ snake_case_name')).toEqual([
      [run('a '), run('quiet', false, true), run(' '), run('loud', true), run(' snake_case_name')],
    ]);
  });

  it('allows spaces inside bold markers and nested emphasis', () => {
    expect(parseRichText('**Bold **text and **bold _both_**')).toEqual([
      [run('Bold ', true), run('text and '), run('bold ', true), run('both', true, true)],
    ]);
  });

  it('leaves stray or arithmetic markers as text', () => {
    expect(parseRichText('5 * 3 * 2 and a lone ** here')).toEqual([[run('5 * 3 * 2 and a lone ** here')]]);
  });

  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(parseRichText('First line\nsecond line\n\n  \n\nNext paragraph')).toEqual([
      [run('First line\nsecond line')],
      [run('Next paragraph')],
    ]);
  });

  it('returns nothing for blank text', () => {
    expect(parseRichText(' \n\n ')).toEqual([]);
  });
});

describe('richTextToPlain', () => {
  it('drops the markers', () => {
    expect(richTextToPlain('***Hi*** there\n\n*again*')).toBe('Hi there\n\nagain');
  });
});
