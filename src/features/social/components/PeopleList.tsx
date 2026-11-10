import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { buildProfilePath } from '../profilePath';
import { formatUsername, type PublicProfile } from '../publicProfile';
import { Avatar } from './Avatar';

interface PeopleQuery {
  data: PublicProfile[] | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/** A list of public profiles (following or followers), each linking to the profile page. */
export function PeopleList({ people, emptyText }: { people: PeopleQuery; emptyText: string }) {
  const { t } = useTranslation();

  if (people.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm">{t('social.people.error')}</p>
        <Button variant="secondary" onClick={() => void people.refetch()}>
          {t('social.retry')}
        </Button>
      </div>
    );
  }
  if (people.isPending || !people.data) {
    return (
      <p role="status" className="text-sm text-fg-muted">
        {t('social.people.loading')}
      </p>
    );
  }
  if (people.data.length === 0) return <p className="text-sm text-fg-muted">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-1">
      {people.data.map((profile) => (
        <li key={profile.uid}>
          <Link
            to={buildProfilePath(profile.username)}
            className="flex min-h-11 items-center gap-3 rounded-md px-2 py-1.5 text-fg hover:bg-surface-muted hover:text-fg"
          >
            <Avatar profile={profile} className="size-9 text-sm" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{profile.displayName ?? formatUsername(profile.username)}</span>
              {profile.displayName && (
                <span className="truncate text-xs text-fg-muted">{formatUsername(profile.username)}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
