import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookShareCard, ShareDialog, shareFileName, useShareableImage } from '@/features/share/lazy';
import { ShareIcon } from '@/shared/ui/icons';
import type { LibraryBook } from '../library';

/** The latest finish date (`YYYY-MM-DD`) as a local date, or `null`. */
function lastFinished(book: LibraryBook): Date | null {
  const day = book.reads
    .map((read) => read.finishedOn)
    .filter((finishedOn): finishedOn is string => finishedOn !== null)
    .sort()
    .at(-1);
  if (!day) return null;
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** "Share": opens a card with the book's catalog cover, title, author, rating and status. */
export function ShareBook({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="flex min-h-11 items-center gap-2 self-start text-sm font-bold text-accent hover:text-accent-hover lg:min-h-8"
      >
        <ShareIcon size={16} />
        {t('share.book.open')}
      </button>
      {isOpen && <ShareBookDialog book={book} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function ShareBookDialog({ book, onClose }: { book: LibraryBook; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  // Only the catalog cover: a personal cover is private and never leaves the app.
  const cover = useShareableImage(book.coverUrl);
  const finished = lastFinished(book);

  const caption =
    book.status === 'read' && finished
      ? t('share.book.finished', {
          date: new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'long', year: 'numeric' }).format(finished),
        })
      : t(`share.book.status.${book.status}`);

  return (
    <ShareDialog
      heading={t('share.book.heading')}
      shareTitle={book.title}
      fileName={shareFileName(book.title)}
      onClose={onClose}
    >
      <BookShareCard
        title={book.title}
        authors={book.authors}
        coverSrc={cover.data ?? null}
        rating={book.rating}
        caption={caption}
      />
    </ShareDialog>
  );
}
