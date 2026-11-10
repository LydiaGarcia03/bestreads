import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { LibraryBook } from '../library';
import { buildShelfPath, SHELF_LIMITS, toggleShelf } from '../shelves';
import { useUpdateBook } from '../useLibrary';
import { useCreateShelf, useShelves } from '../useShelves';
import { ShelfNameForm } from './ShelfNameForm';

/**
 * The book's custom shelves as chips (each opens its shelf), and an "Edit shelves" panel
 * with a checkbox per shelf and a field to create a new one (the book is added to it).
 */
export function BookShelves({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const panelId = useId();
  const headingId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const shelves = useShelves();
  const updateBook = useUpdateBook();
  const createShelf = useCreateShelf();

  const allShelves = shelves.data ?? [];
  const onBook = allShelves.filter((shelf) => book.shelfIds.includes(shelf.id));
  const saveShelves = (shelfIds: string[]) => updateBook.mutate({ bookId: book.id, patch: { shelfIds } });

  const createAndAdd = (name: string) =>
    createShelf.mutate(name, { onSuccess: (shelf) => saveShelves([...book.shelfIds, shelf.id]) });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="sr-only">
        {t('shelves.bookShelves')}
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {onBook.map((shelf) => (
          <li key={shelf.id}>
            <Link
              to={buildShelfPath({ kind: 'custom', shelfId: shelf.id })}
              className="flex h-7 items-center rounded-full border border-border-strong bg-surface px-2.5 text-xs text-fg hover:border-accent hover:text-fg"
            >
              {shelf.name}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-expanded={isEditing}
            aria-controls={isEditing ? panelId : undefined}
            onClick={() => setIsEditing((open) => !open)}
            className="flex h-7 items-center rounded-full border border-dashed border-fg-muted px-2.5 text-xs text-fg hover:border-accent"
          >
            {onBook.length > 0 ? t('shelves.editBookShelves') : t('shelves.addToShelf')}
          </button>
        </li>
      </ul>

      {isEditing && (
        <div id={panelId} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
          {allShelves.length > 0 ? (
            <fieldset className="flex flex-col">
              <legend className="mb-1 text-xs text-fg-muted">{t('shelves.chooseShelves')}</legend>
              {allShelves.map((shelf) => (
                <label key={shelf.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm lg:min-h-9">
                  <input
                    type="checkbox"
                    checked={book.shelfIds.includes(shelf.id)}
                    onChange={() => saveShelves(toggleShelf(book.shelfIds, shelf.id))}
                    className="size-[18px] cursor-pointer accent-accent"
                  />
                  {shelf.name}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-fg-muted">{t('shelves.noCustomShelves')}</p>
          )}

          {allShelves.length < SHELF_LIMITS.count && (
            <ShelfNameForm
              label={t('shelves.newShelfLabel')}
              submitLabel={t('shelves.create')}
              shelves={allShelves}
              isBusy={createShelf.isPending}
              onSubmit={createAndAdd}
            />
          )}
        </div>
      )}

      {(updateBook.isError || createShelf.isError || shelves.isError) && (
        <p role="alert" className="text-xs font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </section>
  );
}
