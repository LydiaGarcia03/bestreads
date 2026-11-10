import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CatalogBook } from '@/features/catalog';
import { Button } from '@/shared/ui/Button';
import type { LibraryBook, ReadingStatus } from '../library';
import { useAddToLibrary, useChangeStatus, useRemoveFromLibrary } from '../useLibrary';
import { StatusMenu } from './StatusMenu';

export interface LibraryStatusProps {
  /** The user's copy, or `null` when the book is not in the library. */
  libraryBook: LibraryBook | null;
  /** Catalog data used to add the book; required when `libraryBook` is `null`. */
  catalogBook: CatalogBook | null;
  title: string;
}

/** Adds the book, changes its status or removes it (after confirmation). */
export function LibraryStatus({ libraryBook, catalogBook, title }: LibraryStatusProps) {
  const { t } = useTranslation();
  const addToLibrary = useAddToLibrary();
  const statusChange = useChangeStatus();
  const removeFromLibrary = useRemoveFromLibrary();
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);

  const mutations = [addToLibrary, statusChange, removeFromLibrary];
  const isBusy = mutations.some((mutation) => mutation.isPending);
  const hasError = mutations.some((mutation) => mutation.isError);
  const resetErrors = () => mutations.forEach((mutation) => mutation.reset());

  const selectStatus = (status: ReadingStatus) => {
    resetErrors();
    if (libraryBook) statusChange.changeStatus(libraryBook, status);
    else if (catalogBook) addToLibrary.mutate({ book: catalogBook, status });
  };

  const confirmRemoval = () => {
    if (!libraryBook) return;
    resetErrors();
    setIsConfirmingRemoval(false);
    removeFromLibrary.mutate(libraryBook.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <StatusMenu
        status={libraryBook?.status ?? null}
        isBusy={isBusy}
        onSelect={selectStatus}
        onRemove={() => setIsConfirmingRemoval(true)}
      />

      {isConfirmingRemoval && libraryBook && (
        <div role="group" aria-label={t('books.removeFromLibrary')} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <p className="text-sm">{t('books.removeConfirm', { title })}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsConfirmingRemoval(false)}>
              {t('books.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRemoval}>
              {t('books.remove')}
            </Button>
          </div>
        </div>
      )}

      {hasError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </div>
  );
}
