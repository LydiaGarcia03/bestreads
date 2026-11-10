import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SHELF_LIMITS,
  ShelfNameForm,
  useCreateShelf,
  useDeleteShelf,
  useRenameShelf,
  useShelfMove,
  type Shelf,
} from '@/features/books/lazy';
import { Button } from '@/shared/ui/Button';

type Editing = { kind: 'rename'; shelfId: string } | { kind: 'delete'; shelfId: string } | null;

/** The user's custom shelves: create, rename, move up or down, delete (after confirmation). */
export function ManageShelves({ shelves }: { shelves: readonly Shelf[] }) {
  const { t } = useTranslation();
  const headingId = useId();
  const [editing, setEditing] = useState<Editing>(null);
  const createShelf = useCreateShelf();
  const renameShelf = useRenameShelf();
  const move = useShelfMove();
  const deleteShelf = useDeleteShelf();
  const hasError = [createShelf, renameShelf, move, deleteShelf].some((mutation) => mutation.isError);

  const iconButton = 'flex size-11 items-center justify-center rounded-md text-fg hover:bg-surface-muted disabled:opacity-30 lg:size-8';

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-bold">
        {t('shelves.manage')}
      </h2>

      {shelves.length === 0 && <p className="text-sm text-fg-muted">{t('shelves.noCustomShelves')}</p>}

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {shelves.map((shelf, index) => (
          <li key={shelf.id} className="flex flex-col gap-2 px-3 py-2">
            {editing?.kind === 'rename' && editing.shelfId === shelf.id ? (
              <ShelfNameForm
                label={t('shelves.renameLabel', { name: shelf.name })}
                submitLabel={t('shelves.save')}
                shelves={shelves}
                shelfId={shelf.id}
                initialName={shelf.name}
                autoFocus
                onSubmit={(name) => {
                  renameShelf.mutate({ shelfId: shelf.id, name });
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate text-sm">{shelf.name}</span>
                <button
                  type="button"
                  aria-label={t('shelves.moveUp', { name: shelf.name })}
                  disabled={index === 0}
                  onClick={() => move.moveBy(shelf.id, -1)}
                  className={iconButton}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={t('shelves.moveDown', { name: shelf.name })}
                  disabled={index === shelves.length - 1}
                  onClick={() => move.moveBy(shelf.id, 1)}
                  className={iconButton}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={t('shelves.rename', { name: shelf.name })}
                  onClick={() => setEditing({ kind: 'rename', shelfId: shelf.id })}
                  className="min-h-11 rounded-md px-2 text-xs text-fg hover:bg-surface-muted lg:min-h-8"
                >
                  {t('shelves.renameShort')}
                </button>
                <button
                  type="button"
                  aria-label={t('shelves.delete', { name: shelf.name })}
                  onClick={() => setEditing({ kind: 'delete', shelfId: shelf.id })}
                  className="min-h-11 rounded-md px-2 text-xs text-danger hover:bg-surface-muted lg:min-h-8"
                >
                  {t('shelves.deleteShort')}
                </button>
              </div>
            )}

            {editing?.kind === 'delete' && editing.shelfId === shelf.id && (
              <div role="group" aria-label={t('shelves.delete', { name: shelf.name })} className="flex flex-col gap-2 pb-1">
                <p className="text-sm">{t('shelves.deleteConfirm', { name: shelf.name })}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(null)}>
                    {t('books.cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      deleteShelf.mutate(shelf.id);
                      setEditing(null);
                    }}
                  >
                    {t('shelves.deleteShort')}
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {shelves.length < SHELF_LIMITS.count ? (
        <ShelfNameForm
          label={t('shelves.newShelfLabel')}
          submitLabel={t('shelves.create')}
          shelves={shelves}
          isBusy={createShelf.isPending}
          onSubmit={(name) => createShelf.mutate(name)}
        />
      ) : (
        <p className="text-sm text-fg-muted">{t('shelves.limitReached', { max: SHELF_LIMITS.count })}</p>
      )}

      {hasError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </section>
  );
}
