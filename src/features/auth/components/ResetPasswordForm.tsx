import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { useAuthActions } from '../AuthContext';
import { useAuthAction } from '../useAuthAction';
import { AuthErrorMessage } from './AuthErrorMessage';
import { readTextField } from './formValues';

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const { sendPasswordReset } = useAuthActions();
  const { isPending, error, run } = useAuthAction();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = readTextField(event.currentTarget, 'email').trim();
    if (await run(() => sendPasswordReset(email))) setSentTo(email);
  };

  if (sentTo) {
    // Same message whether or not the account exists, so emails can't be probed.
    return (
      <p role="status" className="rounded-md border border-border bg-surface-muted p-4 text-sm">
        {t('auth.resetSent', { email: sentTo })}
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <TextField label={t('auth.email')} name="email" type="email" autoComplete="email" required />
      <AuthErrorMessage error={error} />
      <Button type="submit" disabled={isPending}>
        {t('auth.sendResetLink')}
      </Button>
    </form>
  );
}
