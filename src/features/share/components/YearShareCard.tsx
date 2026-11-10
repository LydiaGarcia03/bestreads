import { useTranslation } from 'react-i18next';
import { CardCover, CardStars, CardWordmark } from './CardParts';

export interface YearShareCardProps {
  year: number;
  books: number;
  pages: number;
  averageRating: number | null;
  /** Finished books per month, January first. */
  months: readonly number[];
  favorite: { title: string; coverSrc: string | null; rating: number } | null;
  topAuthor: string | null;
}

/** Tallest month bar, in pixels. */
const BAR_MAX_HEIGHT = 48;

/** Year-in-review share card (9:16, Wrapped-style): totals, books per month and the favorite book. */
export function YearShareCard({ year, books, pages, averageRating, months, favorite, topAuthor }: YearShareCardProps) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const decimal = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });
  const busiest = Math.max(1, ...months);
  const monthInitials = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'narrow' }).format(new Date(year, month, 1)),
  );

  return (
    <div className="flex size-full flex-col justify-between bg-banner p-8 font-sans text-on-banner">
      <CardWordmark />

      <div className="flex flex-col gap-6">
        <h3 className="font-serif text-3xl leading-tight font-bold">{t('share.year.title', { year })}</h3>

        <dl className="grid grid-cols-3 gap-3">
          <CardStat label={t('share.year.books', { count: books })} value={number.format(books)} />
          <CardStat label={t('share.year.pages', { count: pages })} value={number.format(pages)} />
          <CardStat label={t('share.year.average')} value={averageRating === null ? '–' : decimal.format(averageRating)} />
        </dl>

        <div aria-hidden="true" className="flex flex-col gap-1">
          <div className="flex items-end gap-[2px]" style={{ height: BAR_MAX_HEIGHT }}>
            {months.map((count, month) => (
              <div
                key={month}
                className="flex-1 rounded-t-[4px] bg-banner-icon"
                style={{ height: count === 0 ? 2 : Math.max(4, (count / busiest) * BAR_MAX_HEIGHT), opacity: count === 0 ? 0.3 : 1 }}
              />
            ))}
          </div>
          <div className="flex gap-[2px] text-center text-[10px] opacity-70">
            {monthInitials.map((initial, month) => (
              <span key={month} className="flex-1">
                {initial}
              </span>
            ))}
          </div>
        </div>

        {favorite && (
          <div className="flex items-center gap-4">
            <CardCover src={favorite.coverSrc} title={favorite.title} className="w-16" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-bold tracking-wide text-banner-icon uppercase">{t('share.year.favorite')}</p>
              <p className="line-clamp-2 font-serif text-lg leading-tight font-bold">{favorite.title}</p>
              <CardStars rating={favorite.rating} size={16} />
            </div>
          </div>
        )}
        {topAuthor && <p className="text-sm">{t('share.year.topAuthor', { author: topAuthor })}</p>}
      </div>

      <p className="text-xs opacity-70">{t('share.footer')}</p>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-xs opacity-80">{label}</dt>
      <dd className="font-serif text-3xl font-bold text-banner-icon">{value}</dd>
    </div>
  );
}
