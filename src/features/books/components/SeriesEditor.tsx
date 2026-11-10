import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import type { LibraryBook } from '../library';
import { parseSeriesInput, SERIES_LIMITS, type SeriesInputError } from '../series';
import { useUpdateBook } from '../useLibrary';
import { useSeriesNames } from '../useSeries';

/** "Dune · Book 1" with "Edit", or "+ Add to a series"; the form suggests series already in the library. */
export function SeriesEditor({ book }: { book: LibraryBook }) {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const updateBook = useUpdateBook();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);

  if (isEditing) {
    return (
      <SeriesForm
        book={book}
        onCancel={() => setIsEditing(false)}
        onSave={(series) => {
          updateBook.mutate({ bookId: book.id, patch: { series } });
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {book.series ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-fg-muted">{t('series.label')}</span>
          <span className="font-bold">
            {book.series.volume === null
              ? book.series.name
              : t('series.nameAndVolume', { name: book.series.name, volume: number.format(book.series.volume) })}
          </span>
          <button type="button" onClick={() => setIsEditing(true)} className="min-h-11 text-xs text-accent hover:underline lg:min-h-0">
            {t('series.edit')}
          </button>
        </p>
      ) : (
        <button type="button" onClick={() => setIsEditing(true)} className="min-h-11 w-fit text-sm text-accent hover:underline lg:min-h-8">
          {t('series.add')}
        </button>
      )}
      {updateBook.isError && (
        <p role="alert" className="text-xs font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </div>
  );
}

interface SeriesFormProps {
  book: LibraryBook;
  onSave: (series: LibraryBook['series']) => void;
  onCancel: () => void;
}

function SeriesForm({ book, onSave, onCancel }: SeriesFormProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const volumeId = useId();
  const listId = useId();
  const errorId = useId();
  const [name, setName] = useState(book.series?.name ?? '');
  const [volume, setVolume] = useState(book.series?.volume?.toString() ?? '');
  const [error, setError] = useState<SeriesInputError | null>(null);
  const suggestions = useSeriesNames({ enabled: true });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseSeriesInput(name, volume);
    if (result.ok) onSave(result.series);
    else setError(result.error);
  };

  const field = 'h-11 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none lg:h-9';

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={t('series.formLabel')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3"
    >
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={nameId} className="text-xs text-fg-muted">
            {t('series.name')}
          </label>
          <input
            id={nameId}
            value={name}
            list={listId}
            maxLength={SERIES_LIMITS.name}
            autoComplete="off"
            autoFocus
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error === 'nameTooLong'}
            aria-describedby={error ? errorId : undefined}
            className={field}
          />
          <datalist id={listId}>
            {(suggestions.data ?? []).map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
        <div className="flex w-20 flex-col gap-1">
          <label htmlFor={volumeId} className="text-xs text-fg-muted">
            {t('series.volume')}
          </label>
          <input
            id={volumeId}
            value={volume}
            inputMode="decimal"
            autoComplete="off"
            onChange={(event) => setVolume(event.target.value)}
            aria-invalid={error === 'invalidVolume'}
            aria-describedby={error ? errorId : undefined}
            className={`${field} w-full text-center`}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-bold text-danger">
          {t(`series.errors.${error}`, { max: SERIES_LIMITS.name })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="lg:h-9">
          {t('series.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel} className="lg:h-9">
          {t('books.cancel')}
        </Button>
        {book.series && (
          <button type="button" onClick={() => onSave(null)} className="ml-auto min-h-11 text-xs text-fg-muted hover:text-danger hover:underline lg:min-h-9">
            {t('series.remove')}
          </button>
        )}
      </div>
    </form>
  );
}
