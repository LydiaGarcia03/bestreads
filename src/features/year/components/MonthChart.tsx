import { useTranslation } from 'react-i18next';

/** Height of the tallest bar, in pixels. */
const CHART_HEIGHT = 120;
/** A month without books still shows a hairline, so the baseline reads as twelve months. */
const EMPTY_BAR_HEIGHT = 2;

/**
 * Books finished per month: one series (the heading names it), thin bars rounded at the top and
 * anchored to the baseline, with the busiest month labeled and every value on hover or focus.
 * Screen readers get the months as a list.
 */
export function MonthChart({ year, months }: { year: number; months: readonly number[] }) {
  const { t, i18n } = useTranslation();
  const busiest = Math.max(...months);
  const monthName = (month: number, style: 'long' | 'narrow') =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: style }).format(new Date(year, month, 1));

  return (
    // Month initials hang below the baseline, hence the bottom margin.
    <ol className="mb-6 flex items-end gap-0.5 border-b border-border sm:gap-1" style={{ height: CHART_HEIGHT + 24 }}>
      {months.map((count, month) => {
        const label = t('year.monthValue', { month: monthName(month, 'long'), count });
        const height = count === 0 ? EMPTY_BAR_HEIGHT : Math.max(6, (count / busiest) * CHART_HEIGHT);
        const isBusiest = count > 0 && count === busiest;
        return (
          <li
            key={month}
            tabIndex={0}
            aria-label={label}
            className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1 outline-none"
          >
            <span
              aria-hidden="true"
              className={`text-xs font-bold text-fg ${isBusiest ? '' : 'invisible group-hover:visible group-focus-visible:visible'}`}
            >
              {count}
            </span>
            <span
              aria-hidden="true"
              className={`w-full max-w-8 rounded-t-[4px] ${count === 0 ? 'bg-border-strong' : 'bg-accent group-hover:bg-accent-hover group-focus-visible:bg-accent-hover'}`}
              style={{ height }}
            />
            <span aria-hidden="true" className="absolute -bottom-6 text-xs text-fg-muted">
              {monthName(month, 'narrow')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
