import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { LibraryBook } from '../library';
import { canStepRating, RATING_STEP, STAR_COUNT, starFill, stepRating } from '../rating';
import type { RatingChange } from '../types';
import { useUpdateRating } from '../useLibrary';
import { Star } from './Star';

const STAR_POSITIONS = Array.from({ length: STAR_COUNT }, (_, index) => index + 1);
const STAR_SIZE = 32;

/**
 * "My rating": tap a star for a whole value, fine-tune with −/+ (0.25 per step), clear it,
 * and choose whether the rating is public. Changes are saved at once.
 */
export function RatingEditor({ book }: { book: LibraryBook }) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const hintId = useId();
  const updateRating = useUpdateRating();
  const { rating, ratingPublic } = book;

  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 });
  const step = number.format(RATING_STEP);

  const save = (change: Partial<RatingChange>) => {
    const next = { rating, ratingPublic, ...change };
    if (next.rating === rating && next.ratingPublic === ratingPublic) return;
    updateRating.mutate({ book, change: next });
  };

  const stepButton = (direction: 1 | -1, symbol: string, label: string) => (
    <button
      type="button"
      aria-label={label}
      disabled={!canStepRating(rating, direction)}
      onClick={() => save({ rating: stepRating(rating, direction) })}
      className="flex size-11 items-center justify-center rounded-full text-lg text-fg hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent lg:size-9"
    >
      {symbol}
    </button>
  );

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-[15px] font-bold lg:text-xl lg:font-normal lg:italic">
          {t('rating.title')}
        </h2>
        {rating !== null && (
          <button
            type="button"
            onClick={() => save({ rating: null })}
            className="min-h-11 px-1 text-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          >
            {t('rating.clear')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div role="group" aria-label={t('rating.stars')} className="flex gap-1">
          {STAR_POSITIONS.map((position) => (
            <button
              key={position}
              type="button"
              aria-label={t('rating.rateStars', { count: position })}
              onClick={() => save({ rating: position })}
              className="flex h-11 w-10 items-center justify-center rounded-md hover:bg-surface-muted"
            >
              <Star fill={starFill(rating, position)} size={STAR_SIZE} />
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label={t('rating.fineTune')}
          className="flex items-center gap-0.5 rounded-full border border-border-strong p-0.5"
        >
          {stepButton(-1, '−', t('rating.lower', { step }))}
          <output aria-live="polite" className="min-w-12 px-1 text-center font-serif text-base font-bold text-star">
            {rating === null ? (
              <span className="font-sans text-xs font-normal text-fg-muted">{t('rating.unrated')}</span>
            ) : (
              <span aria-label={t('rating.value', { value: number.format(rating) })}>{number.format(rating)}</span>
            )}
          </output>
          {stepButton(1, '+', t('rating.raise', { step }))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={ratingPublic}
            aria-describedby={hintId}
            onChange={(event) => save({ ratingPublic: event.target.checked })}
            className="size-[18px] cursor-pointer accent-accent"
          />
          {t('rating.public')}
        </label>
        <p id={hintId} className="text-xs text-fg-muted">
          {t('rating.publicHint')}
        </p>
      </div>

      {updateRating.isError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('rating.saveError')}
        </p>
      )}
    </section>
  );
}
