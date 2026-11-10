import { useTranslation } from 'react-i18next';
import { useFollowers, useFollowing } from '../useFriends';
import { PeopleList } from './PeopleList';

/** People `uid` follows. */
export function FollowingList({ uid }: { uid: string }) {
  const { t } = useTranslation();
  return <PeopleList people={useFollowing(uid)} emptyText={t('social.people.noFollowing')} />;
}

/** People following `uid`. */
export function FollowersList({ uid }: { uid: string }) {
  const { t } = useTranslation();
  return <PeopleList people={useFollowers(uid)} emptyText={t('social.people.noFollowers')} />;
}
