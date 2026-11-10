import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadTextFile } from '@/shared/files/downloadFile';
import { Button } from '@/shared/ui/Button';
import { MoonIcon } from '@/shared/ui/icons';
import type { LibraryBook } from '../library';
import { planCalendarFile } from '../planCalendar';
import { formatPlanDate, formatPlanTime, weekdayName } from '../planFormat';
import {
  DEFAULT_PLAN,
  estimateFinish,
  isEveningTime,
  isReadingDay,
  nextReadingDay,
  pagesLeft,
  parsePlanInput,
  PLAN_LIMITS,
  WEEKDAYS,
  type PlanInputError,
  type ReadingPlan,
  type Weekday,
} from '../readingPlan';
import { useUpdateBook } from '../useLibrary';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Reading plan of a book being read (the page shows it only then): an "Add reading plan" button,
 * the plan as a strip (next session, pages a day, estimated finish) or its editor.
 */
export function ReadingPlanSection({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const headingId = useId();
  const updateBook = useUpdateBook();
  const [isEditing, setIsEditing] = useState(false);

  const save = (plan: ReadingPlan | null) => {
    updateBook.mutate({ bookId: book.id, patch: { plan } });
    setIsEditing(false);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="sr-only">
        {t('plan.title')}
      </h2>
      {isEditing ? (
        <PlanForm book={book} onSave={save} onCancel={() => setIsEditing(false)} />
      ) : book.plan ? (
        <PlanStrip book={book} plan={book.plan} onEdit={() => setIsEditing(true)} onRemove={() => save(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex min-h-14 w-full items-center gap-3 rounded-md border border-dashed border-dot px-3.5 py-2.5 text-left text-fg hover:border-accent"
        >
          <MoonIcon size={20} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold">{t('plan.add')}</span>{' '}
            <span className="text-xs text-fg-muted">{t('plan.addHint')}</span>
          </span>
          <span aria-hidden="true" className="text-xl font-bold text-accent">
            +
          </span>
        </button>
      )}
      {updateBook.isError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </section>
  );
}

/** "Tonight at 9:00 PM", "Today", "Next: Wed at 9:00 PM"… */
function nextSessionText(plan: ReadingPlan, today: Date, t: Translate, locale: string | undefined): string | null {
  const time = plan.time ? formatPlanTime(plan.time, locale) : null;
  if (isReadingDay(plan, today)) {
    if (!time) return t('plan.today');
    return isEveningTime(plan.time) ? t('plan.tonightAt', { time }) : t('plan.todayAt', { time });
  }
  const next = nextReadingDay(plan, today);
  if (!next) return null;
  const day = weekdayName(next.getDay() as Weekday, locale, 'short');
  return time ? t('plan.nextAt', { day, time }) : t('plan.next', { day });
}

function daysText(plan: ReadingPlan, t: Translate, locale: string | undefined): string {
  if (plan.weekdays.length === WEEKDAYS.length) return t('plan.everyDay');
  return plan.weekdays.map((day) => weekdayName(day, locale, 'short')).join(', ');
}

function finishText(plan: ReadingPlan, book: LibraryBook, today: Date, t: Translate, locale: string | undefined): string {
  const finish = estimateFinish(plan, pagesLeft(book), today);
  if (!finish) return t('plan.needsPageCount');
  if (finish.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    return t('plan.finishingToday');
  }
  return t('plan.finishingAround', { date: formatPlanDate(finish, today, locale) });
}

interface PlanStripProps {
  book: LibraryBook;
  plan: ReadingPlan;
  onEdit: () => void;
  onRemove: () => void;
}

function PlanStrip({ book, plan, onEdit, onRemove }: PlanStripProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;
  const today = new Date();
  const parts = [
    nextSessionText(plan, today, t, locale),
    daysText(plan, t, locale),
    t('plan.pagesPerDayCount', { count: plan.pagesPerDay }),
    finishText(plan, book, today, t, locale),
  ].filter((part): part is string => part !== null);

  const addToCalendar = () => {
    const finish = estimateFinish(plan, pagesLeft(book), today);
    const file = planCalendarFile(plan, {
      uid: `${book.id}-plan@bestreads`,
      summary: t('plan.calendarSummary', { title: book.title, count: plan.pagesPerDay }),
      from: today,
      until: finish,
      now: today,
    });
    if (file) downloadTextFile(`${t('plan.title')} - ${book.title}.ics`, file, 'text/calendar');
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-3 lg:rounded-full lg:px-5">
      <MoonIcon className="shrink-0 text-accent" />
      <p className="min-w-0 flex-[1_1_16rem] text-sm leading-relaxed">{parts.join(' · ')}</p>
      <div className="flex flex-wrap items-center gap-x-4">
        {plan.reminder && plan.time && (
          <button type="button" onClick={addToCalendar} className="min-h-11 text-[13px] font-bold text-accent hover:underline lg:min-h-8">
            {t('plan.addToCalendar')}
          </button>
        )}
        <button type="button" onClick={onEdit} className="min-h-11 text-[13px] font-bold text-fg hover:text-accent lg:min-h-8">
          {t('plan.edit')}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('plan.removeLabel')}
          className="min-h-11 text-[13px] text-fg-muted hover:text-danger lg:min-h-8"
        >
          {t('plan.remove')}
        </button>
      </div>
    </div>
  );
}

interface PlanFormProps {
  book: LibraryBook;
  onSave: (plan: ReadingPlan) => void;
  onCancel: () => void;
}

/** Pages per day, an optional time, reading days and the reminder, with the finish estimate as you type. */
function PlanForm({ book, onSave, onCancel }: PlanFormProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;
  const pagesId = useId();
  const timeId = useId();
  const reminderHintId = useId();
  const initial = book.plan ?? DEFAULT_PLAN;
  const [pagesPerDay, setPagesPerDay] = useState(String(initial.pagesPerDay));
  const [time, setTime] = useState(initial.time ?? '');
  const [weekdays, setWeekdays] = useState<Weekday[]>(initial.weekdays);
  const [reminder, setReminder] = useState(initial.reminder);
  const [error, setError] = useState<PlanInputError | null>(null);

  const input = { pagesPerDay, time, weekdays, reminder };
  const parsed = parsePlanInput(input);
  const today = new Date();
  const finish = parsed.ok ? estimateFinish(parsed.plan, pagesLeft(book), today) : null;

  const toggleDay = (day: Weekday) =>
    setWeekdays((days) => (days.includes(day) ? days.filter((current) => current !== day) : [...days, day]));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (parsed.ok) onSave(parsed.plan);
    else setError(parsed.error);
  };

  return (
    <form
      aria-label={t('plan.formLabel')}
      onSubmit={submit}
      onKeyDown={(event) => event.key === 'Escape' && onCancel()}
      noValidate
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={pagesId} className="text-sm font-bold">
            {t('plan.pagesPerDay')}
          </label>
          <input
            id={pagesId}
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pagesPerDay}
            onChange={(event) => setPagesPerDay(event.target.value)}
            aria-invalid={error === 'invalidPages'}
            className="h-11 w-24 rounded-md border border-border-strong bg-surface text-center text-[15px] font-bold text-fg focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={timeId} className="text-sm font-bold">
            {t('plan.time')} <span className="font-normal text-fg-muted">({t('plan.timeHint')})</span>
          </label>
          <input
            id={timeId}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-invalid={error === 'invalidTime' || error === 'reminderNeedsTime'}
            className="h-11 rounded-md border border-border-strong bg-surface px-3 text-[15px] text-fg focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">{t('plan.weekdays')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={weekdays.includes(day)}
              aria-label={weekdayName(day, locale, 'long')}
              onClick={() => toggleDay(day)}
              className="h-11 min-w-11 rounded-full border border-border-strong px-2 text-xs text-fg capitalize aria-pressed:border-chip-active aria-pressed:bg-chip-active aria-pressed:font-bold aria-pressed:text-on-chip-active"
            >
              {weekdayName(day, locale, 'short')}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={reminder}
            onChange={(event) => setReminder(event.target.checked)}
            aria-describedby={reminderHintId}
            className="size-5 accent-accent"
          />
          {t('plan.reminder')}
        </label>
        <p id={reminderHintId} className="text-xs text-fg-muted">
          {t('plan.reminderHint')}
        </p>
      </div>

      {finish && (
        <p aria-live="polite" className="text-sm text-fg-muted">
          {t('plan.estimate', { date: formatPlanDate(finish, today, locale) })}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t(`plan.errors.${error}`, { max: PLAN_LIMITS.pagesPerDay })}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit">{t('plan.save')}</Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('plan.cancel')}
        </Button>
      </div>
    </form>
  );
}
