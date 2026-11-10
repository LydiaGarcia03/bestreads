import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { buildProfilePath } from '../profilePath';
import { formatUsername } from '../publicProfile';
import { useOwnPublicProfile } from '../usePublicProfile';
import { UsernameForm } from './UsernameForm';

/** The signed-in user's public identity: their `@username`, or the form to choose one. */
export function PublicProfileCard() {
  const { t } = useTranslation();
  const profile = useOwnPublicProfile();

  if (profile.isPending) {
    return (
      <p role="status" className="text-fg-muted">
        {t('social.loading')}
      </p>
    );
  }

  if (profile.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('social.loadError')}</p>
        <Button variant="secondary" onClick={() => void profile.refetch()}>
          {t('social.retry')}
        </Button>
      </div>
    );
  }

  if (!profile.data) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-fg-muted">{t('social.intro')}</p>
        <UsernameForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-fg-muted">{t('social.yourUsername')}</p>
      <p className="text-lg font-bold">{formatUsername(profile.data.username)}</p>
      <p className="text-sm text-fg-muted">{t('social.publicHint')}</p>
      <Link to={buildProfilePath(profile.data.username)} className="mt-1 self-start text-sm font-bold">
        {t('social.viewProfile')}
      </Link>
    </div>
  );
}
