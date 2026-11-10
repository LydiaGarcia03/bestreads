import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { FRIENDS_PATH } from '../profilePath';
import type { PublicProfile } from '../publicProfile';
import { useIsFollowing, useSetFollowing } from '../useFollows';
import { useOwnPublicProfile } from '../usePublicProfile';

/** Follow / unfollow `profile`. Following needs a username of one's own, so followers can be shown. */
export function FollowButton({ profile }: { profile: PublicProfile }) {
  const { t } = useTranslation();
  const ownProfile = useOwnPublicProfile();

  if (ownProfile.isPending) return null;
  if (!ownProfile.data) {
    return (
      <p className="text-sm text-fg-muted">
        {t('social.needUsername')} <Link to={FRIENDS_PATH}>{t('social.chooseUsernameLink')}</Link>
      </p>
    );
  }
  return <FollowToggle profile={profile} />;
}

function FollowToggle({ profile }: { profile: PublicProfile }) {
  const { t } = useTranslation();
  const isFollowing = useIsFollowing(profile.uid);
  const setFollowing = useSetFollowing(profile.uid);

  if (isFollowing.isPending) return null;
  const following = isFollowing.data === true;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={following ? 'secondary' : 'primary'}
        aria-pressed={following}
        disabled={setFollowing.isPending}
        onClick={() => setFollowing.mutate(!following)}
      >
        {following ? t('social.followingButton') : t('social.follow')}
      </Button>
      {(setFollowing.isError || isFollowing.isError) && (
        <p role="alert" className="text-xs font-bold text-danger">
          {t('social.followError')}
        </p>
      )}
    </div>
  );
}
