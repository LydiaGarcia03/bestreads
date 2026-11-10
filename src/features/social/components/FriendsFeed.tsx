import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buildBookPath, StarRating } from '@/features/books/lazy';
import { Button } from '@/shared/ui/Button';
import type { FeedItem } from '../feed';
import { buildProfilePath } from '../profilePath';
import { formatUsername } from '../publicProfile';
import { useFriendsFeed } from '../useFriends';
import { Avatar } from './Avatar';

/** Latest public ratings of the people the signed-in user follows, newest first (at most `size`). */
export function FriendsFeed({ size }: { size?: number }) {
  const { t } = useTranslation();
  const feed = useFriendsFeed(size);

  if (feed.isPending) {
    return (
      <p role="status" className="text-sm text-fg-muted">
        {t('social.feed.loading')}
      </p>
    );
  }
  if (feed.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm">{t('social.feed.error')}</p>
        <Button variant="secondary" onClick={() => void feed.refetch()}>
          {t('social.retry')}
        </Button>
      </div>
    );
  }
  if (feed.data.length === 0) return <p className="text-sm text-fg-muted">{t('social.feed.empty')}</p>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {feed.data.map((item) => (
        <li key={`${item.profile.uid}/${item.rating.bookId}`}>
          <FeedEntry item={item} />
        </li>
      ))}
    </ul>
  );
}

function FeedEntry({ item: { profile, rating } }: { item: FeedItem }) {
  const { i18n } = useTranslation();
  const username = formatUsername(profile.username);
  const profilePath = buildProfilePath(profile.username);
  const date = rating.ratedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(rating.ratedAt)
    : null;

  return (
    <article className="flex items-center gap-3 py-3">
      <Link to={profilePath} tabIndex={-1} aria-hidden="true">
        <Avatar profile={profile} className="size-9 text-sm" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link to={buildBookPath(rating.bookId)} className="line-clamp-2 text-sm font-bold text-fg hover:text-accent">
          {rating.title}
        </Link>
        <p className="text-xs text-fg-muted">
          <Link to={profilePath} className="font-bold">
            {username}
          </Link>
          {date && ` · ${date}`}
        </p>
      </div>
      <StarRating rating={rating.rating} />
    </article>
  );
}
