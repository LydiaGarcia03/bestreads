/**
 * A tiny Markdown subset for book descriptions: paragraphs (blank line), line breaks, **bold**,
 * *italic* / _italic_ and ***both***. Pure, no React or I/O. Anything else stays as plain text,
 * so the result is always safe to render as React text.
 */

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** One paragraph: runs of text with their emphasis. */
export type RichParagraph = TextRun[];

/**
 * Emphasis markers, longest first. Bold may have spaces inside its markers (common after HTML conversion);
 * italic needs text right inside them, and `_` must not touch letters, so "5 * 3 * 2" or snake_case stay plain.
 */
const EMPHASIS =
  /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|\*(?=\S)(.+?)(?<=\S)\*|(?<![\p{L}\p{N}])_(?=\S)(.+?)(?<=\S)_(?![\p{L}\p{N}])/gu;

function parseInline(text: string, bold = false, italic = false): TextRun[] {
  const runs: TextRun[] = [];
  let position = 0;
  for (const match of text.matchAll(EMPHASIS)) {
    const [whole, both, strong, strongUnderscore, emphasis, emphasisUnderscore] = match;
    const start = match.index;
    if (start > position) runs.push({ text: text.slice(position, start), bold, italic });
    const inner = both ?? strong ?? strongUnderscore ?? emphasis ?? emphasisUnderscore ?? '';
    const isBold = both !== undefined || strong !== undefined || strongUnderscore !== undefined;
    const isItalic = both !== undefined || emphasis !== undefined || emphasisUnderscore !== undefined;
    // Emphasis can nest ("**bold *and italic***"), so the inside is parsed again.
    runs.push(...parseInline(inner, bold || isBold, italic || isItalic));
    position = start + whole.length;
  }
  if (position < text.length) runs.push({ text: text.slice(position), bold, italic });
  return runs;
}

export function parseRichText(text: string): RichParagraph[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => parseInline(paragraph));
}

/** The text without emphasis markers (e.g. to measure its length). */
export function richTextToPlain(text: string): string {
  return parseRichText(text)
    .map((paragraph) => paragraph.map((run) => run.text).join(''))
    .join('\n\n');
}
