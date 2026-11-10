import { useTranslation } from 'react-i18next';
import { STAR_COUNT, starFill } from '../rating';
import { Star } from './Star';

const POSITIONS = Array.from({ length: STAR_COUNT }, (_, index) => index + 1);

/** Read-only stars for a rating (partial stars clipped), announced as "3.75 out of 5". */
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const { t, i18n } = useTranslation();
  const value = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 }).format(rating);

  return (
    <span role="img" aria-label={t('rating.value', { value })} className="inline-flex gap-px">
      {POSITIONS.map((position) => (
        <Star key={position} fill={starFill(rating, position)} size={size} />
      ))}
    </span>
  );
}
