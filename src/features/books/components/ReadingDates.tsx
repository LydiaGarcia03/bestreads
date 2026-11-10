import { useId, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/shared/ui/icons';
import type { LibraryBook, ReadPeriod } from '../library';
import { isValidRead, removeRead, replaceRead, toCalendarDay } from '../reads';
import { useUpdateBook } from '../useLibrary';

const EMPTY_READ: ReadPeriod = { startedOn: null, finishedOn: null };

/** `YYYY-MM-DD` in the UI language, without time zone shifts ("Nov 3, 2026"). */
function formatDay(day: string, locale: string | undefined): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1));
}

/**
 * Start and finish dates of every read, newest first (re-reads add more); "Add a past read"
 * records an earlier one. Each date opens the date picker and is saved when picked.
 */
export function ReadingDates({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const headingId = useId();
  const updateBook = useUpdateBook();
  const [invalidRead, setInvalidRead] = useState<number | null>(null);

  const save = (reads: ReadPeriod[]) => updateBook.mutate({ bookId: book.id, patch: { reads } });

  const changeDate = (index: number, field: keyof ReadPeriod, value: string | null) => {
    const current = book.reads[index] ?? EMPTY_READ;
    const read = { ...current, [field]: value };
    if (!isValidRead(read)) {
      setInvalidRead(index);
      return;
    }
    setInvalidRead(null);
    save(replaceRead(book.reads, index, read));
  };

  // Newest first on screen; indexes still refer to the stored (oldest first) list.
  const newestFirst = book.reads.map((read, index) => ({ read, index })).reverse();
  const hasSeveral = book.reads.length > 1;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <h2 id={headingId} className="text-[15px] font-bold lg:text-sm lg:font-normal lg:text-fg-muted">
        {t('reads.title')}
      </h2>

      {newestFirst.map(({ read, index }) => (
        <div
          key={index}
          role="group"
          aria-label={t('reads.readNumber', { number: index + 1 })}
          className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3"
        >
          {hasSeveral && (
            <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
              <span>{t('reads.readNumber', { number: index + 1 })}</span>
              <button
                type="button"
                onClick={() => save(removeRead(book.reads, index))}
                className="min-h-11 px-1 underline-offset-2 hover:text-danger hover:underline lg:min-h-0"
              >
                {t('reads.remove')}
              </button>
            </div>
          )}
          {/* Side by side on phones; stacked in the narrow side column on desktop. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-2">
            <DateField
              label={t('reads.started')}
              value={read.startedOn}
              max={read.finishedOn ?? undefined}
              onChange={(value) => changeDate(index, 'startedOn', value)}
            />
            <DateField
              label={t('reads.finished')}
              value={read.finishedOn}
              min={read.startedOn ?? undefined}
              onChange={(value) => changeDate(index, 'finishedOn', value)}
            />
          </div>
          {invalidRead === index && (
            <p role="alert" className="text-xs font-bold text-danger">
              {t('reads.finishBeforeStart')}
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => save([EMPTY_READ, ...book.reads])}
        className="flex min-h-11 w-fit items-center text-sm font-bold text-accent hover:underline"
      >
        {t('reads.addPastRead')}
      </button>

      {updateBook.isError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </section>
  );
}

interface DateFieldProps {
  label: string;
  value: string | null;
  min?: string;
  max?: string;
  onChange: (value: string | null) => void;
}

/**
 * A date shown as text ("Nov 3, 2026" or "Add date"), with the native date input laid over it:
 * a click opens the picker, and keyboard focus shows the input itself.
 */
function DateField({ label, value, min, max, onChange }: DateFieldProps) {
  const { t, i18n } = useTranslation();
  const today = toCalendarDay(new Date());

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value || null;
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="flex items-center gap-1">
        <div className="relative min-h-11 flex-1 lg:min-h-8">
          <span
            className={`flex h-full items-center text-[15px] font-bold lg:text-sm ${value ? 'text-fg' : 'text-accent'}`}
          >
            {value ? formatDay(value, i18n.resolvedLanguage) : t('reads.addDate')}
          </span>
          <input
            type="date"
            aria-label={label}
            value={value ?? ''}
            min={min}
            max={max && max < today ? max : today}
            onChange={handleChange}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker();
              } catch {
                // Older browsers without showPicker() open the picker from the input itself.
              }
            }}
            className="absolute inset-0 w-full cursor-pointer rounded-md bg-surface px-1 text-sm text-fg opacity-0 focus:opacity-100 focus:outline-2 focus:outline-accent"
          />
        </div>
        {value && (
          <button
            type="button"
            aria-label={t('reads.clearDate', { label })}
            onClick={() => onChange(null)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg lg:size-8"
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
