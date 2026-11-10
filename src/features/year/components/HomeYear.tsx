import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useYearReview } from '../useYearReview';
import { YEAR_PATH } from '../yearPath';

/** Home side column (desktop): this year's books, pages and average rating, with a link to My Year. */
export function HomeYear() {
  const { t, i18n } = useTranslation();
  const year = new Date().getFullYear();
  const { review, isPending, isError } = useYearReview(year);
  const compact = new Intl.NumberFormat(i18n.resolvedLanguage, { notation: 'compact', maximumFractionDigits: 1 });
  const decimal = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });

  return (
    <section aria-labelledby="home-year" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-year" className="text-[15px] font-bold">
          {t('year.heading', { year })}
        </h2>
        <Link to={YEAR_PATH} className="text-[13px] font-bold">
          {t('year.open')}
        </Link>
      </div>
      {isError && <p className="text-sm text-fg-muted">{t('year.loadError')}</p>}
      {!isError && !isPending && (
        <dl className="grid grid-cols-3 gap-2">
          <Stat label={t('year.home.books', { count: review.finished.length })} value={compact.format(review.finished.length)} />
          <Stat label={t('year.home.pages', { count: review.pages })} value={compact.format(review.pages)} />
          <Stat
            label={t('year.home.average')}
            value={review.averageRating === null ? '–' : decimal.format(review.averageRating)}
          />
        </dl>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="font-serif text-xl font-bold">{value}</dd>
    </div>
  );
}
