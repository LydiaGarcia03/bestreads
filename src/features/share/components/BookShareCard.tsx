import { useTranslation } from 'react-i18next';
import { CardCover, CardStars, CardWordmark } from './CardParts';

export interface BookShareCardProps {
  title: string;
  authors: readonly string[];
  /** The catalog cover as a data URL (personal covers are private and never shared). */
  coverSrc: string | null;
  rating: number | null;
  /** E.g. "Finished in November 2026" or "Currently reading". */
  caption: string;
}

/** Single-book share card (9:16): cover, title, author, rating and where the user is with it. */
export function BookShareCard({ title, authors, coverSrc, rating, caption }: BookShareCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex size-full flex-col items-center justify-between bg-banner p-8 text-center font-sans text-on-banner">
      <CardWordmark />
      <div className="flex flex-col items-center gap-5">
        <CardCover src={coverSrc} title={title} className="w-44" />
        <div className="flex flex-col items-center gap-1.5">
          <h3 className="line-clamp-3 font-serif text-2xl leading-tight font-bold">{title}</h3>
          {authors.length > 0 && <p className="line-clamp-1 text-sm opacity-80">{authors.join(', ')}</p>}
        </div>
        {rating !== null && <CardStars rating={rating} size={26} />}
        <p className="text-sm font-bold text-banner-icon">{caption}</p>
      </div>
      <p className="text-xs opacity-70">{t('share.footer')}</p>
    </div>
  );
}
