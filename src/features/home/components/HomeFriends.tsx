import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FRIENDS_PATH } from '@/features/social';
import { FriendsFeed, HOME_FEED_SIZE } from '@/features/social/lazy';

/** Home side column (desktop): the latest public ratings of followed users, with a link to Friends. */
export function HomeFriends() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="home-friends" className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-friends" className="text-[15px] font-bold">
          {t('home.friends.title')}
        </h2>
        <Link to={FRIENDS_PATH} className="text-[13px] font-bold">
          {t('home.friends.seeAll')}
        </Link>
      </div>
      <FriendsFeed size={HOME_FEED_SIZE} />
    </section>
  );
}
