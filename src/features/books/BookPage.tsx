import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useCatalogBook } from '@/features/catalog';
import { Button } from '@/shared/ui/Button';
import { PageHeading } from '@/shared/ui/PageHeading';
import { PageLoader } from '@/shared/ui/PageLoader';
import { BookDetails } from './components/BookDetails';
import { useLibraryBook } from './useLibrary';

/**
 * Book screen (`/book/:bookId`). Books in the library are shown from the user's copy;
 * other books come from the public APIs (only then is the catalog called).
 */
export function BookPage() {
  const { t } = useTranslation();
  const { bookId = '' } = useParams();
  const libraryBook = useLibraryBook(bookId);
  const isOutsideLibrary = libraryBook.isSuccess && libraryBook.data === null;
  const catalogBook = useCatalogBook(bookId, { enabled: isOutsideLibrary });

  if (libraryBook.isError || (isOutsideLibrary && catalogBook.isError)) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('books.loadError')}</p>
        <Button
          variant="secondary"
          onClick={() => void (libraryBook.isError ? libraryBook.refetch() : catalogBook.refetch())}
        >
          {t('books.retry')}
        </Button>
      </div>
    );
  }

  if (libraryBook.isPending || (isOutsideLibrary && catalogBook.isPending)) return <PageLoader />;

  const info = libraryBook.data ?? catalogBook.data;
  if (!info) {
    return (
      <section className="flex flex-col gap-2">
        <PageHeading>{t('books.notFound.title')}</PageHeading>
        <p className="text-fg-muted">{t('books.notFound.description')}</p>
      </section>
    );
  }

  return <BookDetails info={info} libraryBook={libraryBook.data} catalogBook={catalogBook.data ?? null} />;
}
