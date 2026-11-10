import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { PageHeading } from '@/shared/ui/PageHeading';
import { PageLoader } from '@/shared/ui/PageLoader';
import { MonthChart } from './components/MonthChart';
import { ShareYear } from './components/ShareYear';
import { FinishedBooks, YearHighlights, YearStats } from './components/YearSections';
import { useYearReview } from './useYearReview';
import { YEAR_PARAM } from './yearPath';
import { parseYear } from './yearReview';

/**
 * My Year (`/year?year=2026`): books finished in a year (re-reads count again), pages, average
 * rating, books per month, highlights and a share card. Defaults to the current year.
 */
export function YearPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const year = parseYear(params.get(YEAR_PARAM), new Date().getFullYear());
  const { review, years, isPending, isError, refetch } = useYearReview(year);

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('year.loadError')}</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {t('books.retry')}
        </Button>
      </div>
    );
  }
  if (isPending) return <PageLoader />;

  const hasBooks = review.finished.length > 0;

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <PageHeading>{t('year.heading', { year })}</PageHeading>
          {years.length > 1 && (
            <nav aria-label={t('year.years')} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              {years.map((option) => (
                <Link
                  key={option}
                  to={`?${YEAR_PARAM}=${option}`}
                  aria-current={option === year ? 'page' : undefined}
                  className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-bold lg:min-h-9 ${
                    option === year
                      ? 'border-chip-active bg-chip-active text-on-chip-active hover:text-on-chip-active'
                      : 'border-border bg-surface text-fg hover:text-fg'
                  }`}
                >
                  {option}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {hasBooks && <ShareYear review={review} />}
      </header>

      {hasBooks ? (
        <>
          <YearStats review={review} />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
            <Section id="year-months" title={t('year.months')}>
              <MonthChart year={year} months={review.months} />
            </Section>
            <Section id="year-highlights" title={t('year.highlights.title')}>
              <YearHighlights review={review} />
            </Section>
          </div>
          <Section id="year-finished" title={t('year.finished', { count: review.finished.length })}>
            <FinishedBooks finished={review.finished} />
          </Section>
        </>
      ) : (
        <p className="text-fg-muted">{t('year.empty', { year })}</p>
      )}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4">
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
