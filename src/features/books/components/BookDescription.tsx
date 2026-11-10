import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseRichText, richTextToPlain, type TextRun } from '@/shared/text/richText';

/** Descriptions longer than this (without markers) start collapsed. */
const COLLAPSED_LENGTH = 400;

function Run({ run }: { run: TextRun }) {
  const text = run.italic ? <em>{run.text}</em> : run.text;
  return run.bold ? <strong>{text}</strong> : <>{text}</>;
}

/** Book description with paragraphs, bold and italic (see `richText.ts`); long ones collapse with "Show more". */
export function BookDescription({ text }: { text: string }) {
  const { t } = useTranslation();
  const paragraphs = parseRichText(text);
  const isLong = richTextToPlain(text).length > COLLAPSED_LENGTH;
  const [isExpanded, setIsExpanded] = useState(false);
  const isCollapsed = isLong && !isExpanded;

  return (
    <div className="flex max-w-[640px] flex-col items-start gap-1">
      <div
        className={`flex flex-col gap-3 text-[15px] leading-relaxed whitespace-pre-line ${
          isCollapsed ? 'max-h-[10.5rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)]' : ''
        }`}
      >
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex}>
            {paragraph.map((run, runIndex) => (
              <Run key={runIndex} run={run} />
            ))}
          </p>
        ))}
      </div>
      {isLong && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="min-h-11 text-sm font-bold text-accent hover:text-accent-hover"
        >
          {isExpanded ? t('books.showLess') : t('books.showMore')}
        </button>
      )}
    </div>
  );
}
