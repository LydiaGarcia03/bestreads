import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookCover, buildBookPath, StarRating } from '@/features/books/lazy';
import { Button } from '@/shared/ui/Button';
import type { PublicRating } from '../publicRating';
import { usePublicRatings } from '../usePublicRatings';

/** `uid`'s public ratings: a list on phones, a cover grid on desktop, with "Load more". */
export function PublicRatingList({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const ratings = usePublicRatings(uid);

  if (ratings.isPending) {
    return (
      <p role="status" className="text-fg-muted">
        {t('social.profile.loadingRatings')}
      </p>
    );
  }
  if (ratings.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('social.profile.ratingsError')}</p>
        <Button variant="secondary" onClick={() => void ratings.refetch()}>
          {t('social.retry')}
        </Button>
      </div>
    );
  }
  if (ratings.data.length === 0) return <p className="text-fg-muted">{t('social.profile.noRatings')}</p>;

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-border lg:grid lg:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] lg:gap-x-6 lg:gap-y-8 lg:divide-y-0">
        {ratings.data.map((rating) => (
          <li key={rating.bookId}>
            <RatedBook rating={rating} />
          </li>
        ))}
      </ul>
      {ratings.hasNextPage && (
        <Button
          variant="secondary"
          disabled={ratings.isFetchingNextPage}
          onClick={() => void ratings.fetchNextPage()}
          className="self-center"
        >
          {ratings.isFetchingNextPage ? t('social.profile.loadingMore') : t('social.profile.loadMore')}
        </Button>
      )}
    </div>
  );
}

function RatedBook({ rating }: { rating: PublicRating }) {
  const { t, i18n } = useTranslation();
  const date = rating.ratedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(rating.ratedAt)
    : null;

  return (
    <Link
      to={buildBookPath(rating.bookId)}
      className="group flex gap-4 py-3 text-fg hover:text-fg lg:flex-col lg:gap-2 lg:py-0"
    >
      <BookCover src={rating.coverUrl} title={rating.title} className="w-14 shrink-0 lg:w-full" />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-[15px] font-bold group-hover:text-accent lg:text-sm">{rating.title}</h3>
        {rating.authors.length > 0 && (
          <p className="line-clamp-1 text-sm text-fg-muted lg:text-xs">{rating.authors.join(', ')}</p>
        )}
        <StarRating rating={rating.rating} />
        {date && <p className="text-xs text-fg-muted">{t('social.profile.ratedOn', { date })}</p>}
      </div>
    </Link>
  );
}
