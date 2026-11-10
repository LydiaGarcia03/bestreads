import { useTranslation } from 'react-i18next';
import { StarIcon } from '@/shared/ui/icons';

import { cardStarFill, STAR_POSITIONS } from '../cardStars';

/** Stars drawn in the card colors (partial stars clipped), announced as "4.5 out of 5". */
export function CardStars({ rating, size }: { rating: number; size: number }) {
  const { t, i18n } = useTranslation();
  const value = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 }).format(rating);

  return (
    <span role="img" aria-label={t('rating.value', { value })} className="inline-flex gap-0.5">
      {STAR_POSITIONS.map((position) => {
        const fill = cardStarFill(rating, position);
        return (
          <span key={position} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            <StarIcon size={size} className="text-on-banner opacity-25" />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarIcon size={size} className="max-w-none text-banner-icon" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** The "bestreads" wordmark in card colors. */
export function CardWordmark() {
  return (
    <p aria-hidden="true" className="font-serif text-xl font-bold tracking-tight">
      best<span className="text-banner-icon">reads</span>
    </p>
  );
}

/** A cover (already a data URL) or, without one, a block with the title. */
export function CardCover({ src, title, className }: { src: string | null; title: string; className: string }) {
  return (
    <div className={`aspect-[2/3] shrink-0 overflow-hidden rounded-sm bg-on-banner/10 shadow-lg ${className}`}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center p-3 text-center font-serif text-sm leading-snug font-bold">
          {title}
        </div>
      )}
    </div>
  );
}
