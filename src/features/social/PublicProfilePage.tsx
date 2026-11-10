import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { PageHeading } from '@/shared/ui/PageHeading';
import { Avatar } from './components/Avatar';
import { FollowButton } from './components/FollowButton';
import { PublicRatingList } from './components/PublicRatingList';
import { canFollow } from './follows';
import { FRIENDS_PATH } from './profilePath';
import { formatUsername, type PublicProfile } from './publicProfile';
import { useFollowCounts } from './useFollows';
import { useProfileByUsername, useSignedInUser } from './usePublicProfile';
import { validateUsername } from './username';

/** Public profile screen (`/u/:username`): name, photo, follow counts, follow button and public ratings. */
export function PublicProfilePage() {
  const { t } = useTranslation();
  const params = useParams();
  const validation = validateUsername(params.username ?? '');
  const username = validation.ok ? validation.username : '';
  const profile = useProfileByUsername(username);

  if (!validation.ok) return <ProfileNotFound username={params.username ?? ''} />;

  if (profile.isPending) {
    return (
      <p role="status" className="text-fg-muted">
        {t('social.profile.loading')}
      </p>
    );
  }
  if (profile.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('social.profile.loadError')}</p>
        <Button variant="secondary" onClick={() => void profile.refetch()}>
          {t('social.retry')}
        </Button>
      </div>
    );
  }
  if (!profile.data) return <ProfileNotFound username={username} />;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader profile={profile.data} />
      <section aria-labelledby="public-ratings" className="flex flex-col gap-4">
        <h2 id="public-ratings" className="text-lg font-bold">
          {t('social.profile.ratings')}
        </h2>
        <PublicRatingList uid={profile.data.uid} />
      </section>
    </div>
  );
}

function ProfileHeader({ profile }: { profile: PublicProfile }) {
  const { t } = useTranslation();
  const viewer = useSignedInUser();
  const counts = useFollowCounts(profile.uid);
  const username = formatUsername(profile.username);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <Avatar profile={profile} className="size-20 text-3xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <PageHeading>{profile.displayName ?? username}</PageHeading>
        {profile.displayName && <p className="text-fg-muted">{username}</p>}
        {counts.data && (
          <p className="text-sm text-fg-muted">
            {t('social.profile.followers', { count: counts.data.followers })} ·{' '}
            {t('social.profile.following', { count: counts.data.following })}
          </p>
        )}
      </div>
      {viewer && canFollow(viewer.uid, profile.uid) ? (
        <FollowButton profile={profile} />
      ) : (
        <p className="text-sm text-fg-muted">{t('social.profile.you')}</p>
      )}
    </header>
  );
}

function ProfileNotFound({ username }: { username: string }) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-start gap-3">
      <PageHeading>{t('social.profile.notFound')}</PageHeading>
      <p className="text-fg-muted">{t('social.profile.notFoundHint', { username: formatUsername(username) })}</p>
      <Link to={FRIENDS_PATH}>{t('social.profile.backToFriends')}</Link>
    </section>
  );
}
