import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { useAuth, useAuthActions } from '../AuthContext';
import { useAuthAction } from '../useAuthAction';
import { AuthErrorMessage } from './AuthErrorMessage';

/** Signed-in user's name and email with a sign-out button; renders nothing until signed in. */
export function AccountDetails() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        {user.displayName && <span className="font-bold">{user.displayName}</span>}
        {user.email && <span className="text-sm text-fg-muted">{user.email}</span>}
      </div>
      <SignOutButton />
    </div>
  );
}

/** Only rendered for a signed-in user, when the auth actions are available. */
function SignOutButton() {
  const { t } = useTranslation();
  const { signOut } = useAuthActions();
  const { isPending, error, run } = useAuthAction();

  return (
    <>
      <AuthErrorMessage error={error} />
      <Button variant="secondary" disabled={isPending} onClick={() => void run(signOut)} className="self-start">
        {t('auth.signOut')}
      </Button>
    </>
  );
}
