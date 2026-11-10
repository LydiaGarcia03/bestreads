import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { LibraryBook } from '../library';
import { MAX_RATING, MIN_RATING, ratingAtStar, STAR_COUNT, starFill, stepRating } from '../rating';
import type { RatingChange } from '../types';
import { useUpdateRating } from '../useLibrary';
import { Star } from './Star';

const STAR_POSITIONS = Array.from({ length: STAR_COUNT }, (_, index) => index + 1);
const STAR_SIZE = 32;

/** Keys that move the rating, as in any slider. */
const KEY_CHANGES: Record<string, (rating: number | null) => number | null> = {
  ArrowRight: (rating) => stepRating(rating, 1),
  ArrowUp: (rating) => stepRating(rating, 1),
  ArrowLeft: (rating) => stepRating(rating, -1),
  ArrowDown: (rating) => stepRating(rating, -1),
  Home: () => MIN_RATING,
  End: () => MAX_RATING,
};

/**
 * "My rating": the stars follow the pointer in 0.25 steps (a partial star fills as you move across
 * it) and a click or tap saves; the arrow keys change it by 0.25. It can be cleared, and made public.
 */
export function RatingEditor({ book }: { book: LibraryBook }) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const hintId = useId();
  const updateRating = useUpdateRating();
  const { rating, ratingPublic } = book;
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [preview, setPreview] = useState<number | null>(null);

  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 });
  const shown = preview ?? rating;

  const save = (change: Partial<RatingChange>) => {
    const next = { rating, ratingPublic, ...change };
    if (next.rating === rating && next.ratingPublic === ratingPublic) return;
    updateRating.mutate({ book, change: next });
  };

  /** The star under `clientX` (or the nearest one) and how far across it the pointer is. */
  const ratingAtPointer = (clientX: number) => {
    const stars = starRefs.current;
    for (const [index, star] of stars.entries()) {
      if (!star) continue;
      const box = star.getBoundingClientRect();
      if (clientX <= box.right || index === stars.length - 1) {
        return ratingAtStar(index + 1, box.width > 0 ? (clientX - box.left) / box.width : 1);
      }
    }
    return MIN_RATING;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Keeps the moves of a finger sliding across the stars coming here.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPreview(ratingAtPointer(event.clientX));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    save({ rating: ratingAtPointer(event.clientX) });
    // A mouse still hovers (the preview follows it); a finger is gone.
    if (event.pointerType !== 'mouse') setPreview(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const change = KEY_CHANGES[event.key];
    if (!change) return;
    event.preventDefault();
    // Starts from what is shown: quick key presses can come before the last save shows up in `rating`.
    const next = change(shown);
    if (next === shown) return;
    setPreview(next);
    updateRating.mutate({ book, change: { rating: next, ratingPublic } });
  };

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="slider"
          tabIndex={0}
          aria-label={t('rating.stars')}
          aria-valuemin={MIN_RATING}
          aria-valuemax={MAX_RATING}
          aria-valuenow={rating ?? undefined}
          aria-valuetext={rating === null ? t('rating.unrated') : t('rating.value', { value: number.format(rating) })}
          onPointerMove={(event) => setPreview(ratingAtPointer(event.clientX))}
          onPointerLeave={() => setPreview(null)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setPreview(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setPreview(null)}
          className="flex min-h-11 cursor-pointer touch-none items-center gap-1 rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {STAR_POSITIONS.map((position) => (
            <span
              key={position}
              ref={(element) => {
                starRefs.current[position - 1] = element;
              }}
              className="flex"
            >
              <Star fill={starFill(shown, position)} size={STAR_SIZE} />
            </span>
          ))}
        </div>
        {/* The slider already announces the value; this is the visible number. */}
        <span aria-hidden="true" className={`min-w-10 font-serif text-base font-bold ${preview === null || preview === rating ? 'text-star' : 'text-fg-muted'}`}>
          {shown === null ? (
            <span className="font-sans text-xs font-normal text-fg-muted">{t('rating.unrated')}</span>
          ) : (
            number.format(shown)
          )}
        </span>
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
