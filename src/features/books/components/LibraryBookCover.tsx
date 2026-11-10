import type { LibraryBook } from '../library';
import { usePersonalCover } from '../usePersonalCover';
import { BookCover } from './BookCover';

export interface LibraryBookCoverProps {
  book: Pick<LibraryBook, 'id' | 'title' | 'coverUrl' | 'hasPersonalCover'>;
  className?: string;
}

/**
 * A library book's cover: the owner's own photo first, then the API cover, then the placeholder.
 * The photo is only requested for books that have one; the API cover shows while it loads.
 */
export function LibraryBookCover({ book, className }: LibraryBookCoverProps) {
  const personal = usePersonalCover(book.id, { enabled: book.hasPersonalCover });
  const src = (book.hasPersonalCover ? personal.data : null) ?? book.coverUrl;
  return <BookCover src={src} title={book.title} className={className} />;
}
