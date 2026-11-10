import { useTranslation } from 'react-i18next';
import type { CatalogBook } from '@/features/catalog';
import type { LibraryBook, LibraryBookInfo } from '../library';
import { BookCover } from './BookCover';
import { BookDescription } from './BookDescription';
import { BookShelves } from './BookShelves';
import { ChangeCover } from './ChangeCover';
import { LibraryBookCover } from './LibraryBookCover';
import { LibraryStatus } from './LibraryStatus';
import { ProgressSection } from './ProgressSection';
import { RatingEditor } from './RatingEditor';
import { ReadingPlanSection } from './ReadingPlanSection';
import { ReadingDates } from './ReadingDates';
import { ReviewSection } from './ReviewSection';
import { SeriesEditor } from './SeriesEditor';
import { SeriesPanel } from './SeriesPanel';

export interface BookDetailsProps {
  info: LibraryBookInfo;
  libraryBook: LibraryBook | null;
  catalogBook: CatalogBook | null;
}

const LAYOUT =
  "grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-5 [grid-template-areas:'cover_title''cover_status''description_description''progress_progress''rating_rating''dates_dates''review_review'] lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-6 lg:[grid-template-areas:'aside_title''aside_main']";
/** With a series: the series panel after the dates on phones, a third column on desktop (as in the mock). */
const LAYOUT_WITH_SERIES =
  "grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-5 [grid-template-areas:'cover_title''cover_status''description_description''progress_progress''rating_rating''dates_dates''series_series''review_review'] lg:grid-cols-[15rem_minmax(0,1fr)_19rem] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6 lg:[grid-template-areas:'aside_title_series''aside_main_series']";

/** Spacing between the sections that follow each other (mobile) or stack in the center column (desktop). */
const SECTION = 'border-t border-border pt-5 lg:border-0 lg:pt-0';

/**
 * Book page, one DOM for both sizes. The title comes first (reading order); the side column
 * (cover, status, dates) and the main column (description, progress, rating) are flex columns on
 * desktop (lg) and `display: contents` on mobile, where grid areas order every block:
 * cover beside title and status, then description, progress, rating and dates.
 * Progress and the reading plan show only while reading; rating and dates only for books in the library.
 */
export function BookDetails({ info, libraryBook, catalogBook }: BookDetailsProps) {
  const { t } = useTranslation();
  const facts = [
    info.pageCount ? t('books.pageCount', { count: info.pageCount }) : null,
    info.publishedYear?.toString() ?? null,
  ].filter((fact): fact is string => fact !== null);
  const showsDates = libraryBook !== null && (libraryBook.status !== 'wantToRead' || libraryBook.reads.length > 0);
  const showsSeries = libraryBook?.series != null;

  return (
    <article className={showsSeries ? LAYOUT_WITH_SERIES : LAYOUT}>
      <header className="flex min-w-0 flex-col gap-1.5 [grid-area:title] lg:self-end">
        <h1 className="text-[22px] leading-tight font-bold lg:text-4xl">{info.title}</h1>
        {info.subtitle && <p className="text-sm text-fg-muted lg:text-base">{info.subtitle}</p>}
        {info.authors.length > 0 && (
          <p className="text-sm text-fg-muted lg:text-base">{t('books.by', { authors: info.authors.join(', ') })}</p>
        )}
        {facts.length > 0 && <p className="text-xs text-fg-muted lg:text-sm">{facts.join(' · ')}</p>}
      </header>

      <div className="contents lg:flex lg:flex-col lg:gap-5 lg:[grid-area:aside]">
        <div className="flex flex-col gap-1 [grid-area:cover]">
          {libraryBook ? (
            <>
              <LibraryBookCover book={libraryBook} className="w-full shadow-md" />
              <ChangeCover book={libraryBook} />
            </>
          ) : (
            <BookCover src={info.coverUrl} title={info.title} className="w-full shadow-md" />
          )}
        </div>
        <div className="flex flex-col gap-3 [grid-area:status]">
          <LibraryStatus libraryBook={libraryBook} catalogBook={catalogBook} title={info.title} />
          {libraryBook && <BookShelves book={libraryBook} />}
          {libraryBook && <SeriesEditor book={libraryBook} />}
        </div>
        {showsDates && (
          <div className={`${SECTION} [grid-area:dates]`}>
            <ReadingDates book={libraryBook} />
          </div>
        )}
      </div>

      <div className="contents lg:flex lg:max-w-2xl lg:flex-col lg:gap-10 lg:[grid-area:main]">
        {info.description && (
          <div className="[grid-area:description]">
            <BookDescription text={info.description} />
          </div>
        )}
        {libraryBook?.status === 'reading' && (
          <div className={`${SECTION} flex flex-col gap-5 [grid-area:progress] lg:gap-6`}>
            <ProgressSection book={libraryBook} />
            <ReadingPlanSection book={libraryBook} />
          </div>
        )}
        {libraryBook && (
          <div className={`${SECTION} [grid-area:rating]`}>
            <RatingEditor book={libraryBook} />
          </div>
        )}
        {libraryBook && (
          <div className={`${SECTION} [grid-area:review]`}>
            <ReviewSection book={libraryBook} />
          </div>
        )}
      </div>

      {showsSeries && (
        // Desktop: a full-height column that stays in view and scrolls on its own (long series).
        <div className="border-t border-border pt-5 [grid-area:series] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <SeriesPanel book={libraryBook} />
        </div>
      )}
    </article>
  );
}
