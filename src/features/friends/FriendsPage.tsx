import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth';
import { FindPersonForm, FollowersList, FollowingList, FriendsFeed, PublicProfileCard } from '@/features/social/lazy';
import { PageHeading } from '@/shared/ui/PageHeading';

/**
 * Friends: find people by @username, the user's public profile, the feed of followed users'
 * public ratings, and who the user follows / is followed by. Desktop: feed on the left, the rest on the right.
 */
export function FriendsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const uid = auth.status === 'signedIn' ? auth.user.uid : '';

  return (
    <div className="flex max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_auto_auto_1fr] lg:items-start lg:gap-x-12">
      <div className="lg:col-span-2">
        <PageHeading>{t('pages.friends.title')}</PageHeading>
      </div>
      <Section id="friends-find" title={t('social.find.title')} className="lg:col-start-2">
        <FindPersonForm />
      </Section>
      <Section id="friends-profile" title={t('social.profileSection')} className="lg:col-start-2">
        <PublicProfileCard />
      </Section>
      <Section id="friends-feed" title={t('social.feed.title')} className="lg:col-start-1 lg:row-span-4 lg:row-start-2">
        <FriendsFeed />
      </Section>
      <Section id="friends-following" title={t('social.people.following')} className="lg:col-start-2">
        <FollowingList uid={uid} />
      </Section>
      <Section id="friends-followers" title={t('social.people.followers')} className="lg:col-start-2">
        <FollowersList uid={uid} />
      </Section>
    </div>
  );
}

function Section({ id, title, className, children }: { id: string; title: string; className: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
