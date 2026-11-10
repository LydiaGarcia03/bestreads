import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShareDialog, shareFileName, useShareableImage, YearShareCard } from '@/features/share/lazy';
import { Button } from '@/shared/ui/Button';
import { ShareIcon } from '@/shared/ui/icons';
import type { YearReview } from '../yearReview';

/** "Share my year": a Wrapped-style card with the year's totals, months and favorite book. */
export function ShareYear({ review }: { review: YearReview }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button aria-haspopup="dialog" onClick={() => setIsOpen(true)} className="gap-2">
        <ShareIcon size={18} />
        {t('year.share')}
      </Button>
      {isOpen && <ShareYearDialog review={review} onClose={() => setIsOpen(false)} />}
    </>
  );
}

function ShareYearDialog({ review, onClose }: { review: YearReview; onClose: () => void }) {
  const { t } = useTranslation();
  const favorite = review.topRated[0] ?? null;
  // Only catalog covers: personal covers are private and never leave the app.
  const cover = useShareableImage(favorite?.coverUrl ?? null);
  const title = t('share.year.title', { year: review.year });

  return (
    <ShareDialog heading={t('year.shareHeading')} shareTitle={title} fileName={shareFileName(title)} onClose={onClose}>
      <YearShareCard
        year={review.year}
        books={review.finished.length}
        pages={review.pages}
        averageRating={review.averageRating}
        months={review.months}
        favorite={
          favorite?.rating != null ? { title: favorite.title, coverSrc: cover.data ?? null, rating: favorite.rating } : null
        }
        topAuthor={review.topAuthor?.name ?? null}
      />
    </ShareDialog>
  );
}
