import { useTranslation } from 'react-i18next';
import type { BookSeries } from '@/features/catalog';

/** The series after a title, as Goodreads writes it: "(Dune, #1)", or "(Dune)" without a position. */
export function SeriesLabel({ series }: { series: BookSeries | null }) {
  const { t } = useTranslation();
  if (!series) return null;

  return (
    <>
      {/* Outside the span, so the accessible name reads "Dune (Dune, #1)" with the space. */}{' '}
      <span className="font-normal text-fg-muted">
        {series.position
          ? t('books.seriesPosition', { name: series.name, position: series.position })
          : t('books.series', { name: series.name })}
      </span>
    </>
  );
}
