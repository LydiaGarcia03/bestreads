import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { PROGRESS_UNITS, type LibraryBook, type ProgressUnit } from '../library';
import { isProgressComplete, parseProgressInput, progressIn, progressPercent, type ProgressInputError } from '../progress';
import { useChangeStatus, useUpdateBook } from '../useLibrary';

/** "Progress" for a book being read: share read with a bar, "Update progress" and, once finished, "Mark as read". */
export function ProgressSection({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const headingId = useId();
  const updateBook = useUpdateBook();
  const statusChange = useChangeStatus();
  const [isEditing, setIsEditing] = useState(false);

  const { progress, pageCount } = book;
  const percent = progressPercent(progress, pageCount);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-[15px] font-bold lg:sr-only">
        {t('progress.title')}
      </h2>

      {isEditing ? (
        <ProgressForm
          book={book}
          onCancel={() => setIsEditing(false)}
          onSave={(next) => {
            updateBook.mutate({ bookId: book.id, patch: { progress: next } });
            setIsEditing(false);
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
            {percent !== null && (
              <p className="font-serif text-3xl leading-none font-bold text-accent lg:text-5xl">{t('progress.percent', { value: percent })}</p>
            )}
            <p className="text-sm text-fg-muted">
              {!progress && t('progress.notStarted')}
              {progress?.unit === 'pages' &&
                (pageCount
                  ? t('progress.pageOf', { page: progress.value, total: pageCount })
                  : t('progress.page', { page: progress.value }))}
            </p>
            <Button variant="secondary" onClick={() => setIsEditing(true)} className="ml-auto h-9 rounded-full">
              {t('progress.update')}
            </Button>
          </div>
          <div
            role="progressbar"
            aria-label={t('progress.title')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? 0}
            className="h-1.5 overflow-hidden rounded-full bg-border"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent ?? 0}%` }} />
          </div>
        </>
      )}

      {isProgressComplete(progress, pageCount) && !isEditing && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p>{t('progress.finishedQuestion')}</p>
          <Button onClick={() => statusChange.changeStatus(book, 'read')}>{t('progress.markAsRead')}</Button>
        </div>
      )}

      {(updateBook.isError || statusChange.isError) && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </section>
  );
}

export interface ProgressFormProps {
  book: LibraryBook;
  onSave: (progress: LibraryBook['progress']) => void;
  onCancel: () => void;
}

const valueText = (value: number | null) => (value === null ? '' : String(value));

/** Pages / % toggle and the current page or percentage, checked on save (also used by the Home card). */
export function ProgressForm({ book, onSave, onCancel }: ProgressFormProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const errorId = useId();
  const { progress, pageCount } = book;
  const [unit, setUnit] = useState<ProgressUnit>(progress?.unit ?? (pageCount ? 'pages' : 'percent'));
  const [text, setText] = useState(valueText(progressIn(unit, progress, pageCount)));
  const [error, setError] = useState<ProgressInputError | null>(null);

  const switchUnit = (next: ProgressUnit) => {
    if (next === unit) return;
    // Carry the typed value over to the other unit when it can be converted.
    const typed = parseProgressInput(unit, text, pageCount);
    setText(valueText(progressIn(next, typed.ok ? typed.progress : progress, pageCount)));
    setUnit(next);
    setError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseProgressInput(unit, text, pageCount);
    if (result.ok) onSave(result.progress);
    else setError(result.error);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div role="group" aria-label={t('progress.unitLabel')} className="flex w-fit overflow-hidden rounded-md border border-border-strong">
        {PROGRESS_UNITS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === unit}
            onClick={() => switchUnit(option)}
            className="h-9 px-3.5 text-xs text-fg aria-pressed:bg-fg aria-pressed:font-bold aria-pressed:text-bg"
          >
            {t(`progress.units.${option}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={inputId}>{t(unit === 'pages' ? 'progress.onPage' : 'progress.atPercent')}</label>
        <input
          id={inputId}
          // Typing stays free-form; the value is checked on save (whole number within the limits).
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          autoFocus
          className="h-10 w-20 rounded-md border border-border-strong bg-surface text-center text-[15px] font-bold text-fg focus:border-accent focus:outline-none"
        />
        <span className="text-fg-muted">
          {unit === 'percent' ? '%' : pageCount ? t('progress.ofPages', { total: pageCount }) : null}
        </span>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm font-bold text-danger">
          {t(`progress.errors.${error}`, { total: pageCount })}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit">{t('progress.save')}</Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('books.cancel')}
        </Button>
      </div>
    </form>
  );
}
