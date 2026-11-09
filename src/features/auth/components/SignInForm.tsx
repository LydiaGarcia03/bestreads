import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { useAuthActions } from '../AuthContext';
import { useAuthAction } from '../useAuthAction';
import { AuthErrorMessage } from './AuthErrorMessage';
import { readTextField } from './formValues';

export function SignInForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { t } = useTranslation();
  const { signInWithEmail } = useAuthActions();
  const { isPending, error, run } = useAuthAction();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    void run(() =>
      signInWithEmail({ email: readTextField(form, 'email'), password: readTextField(form, 'password') }),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label={t('auth.email')} name="email" type="email" autoComplete="email" required />
      <div className="flex flex-col gap-1">
        <TextField
          label={t('auth.password')}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          onClick={onForgotPassword}
          className="min-h-11 self-end text-sm font-bold text-accent hover:text-accent-hover"
        >
          {t('auth.forgotPassword')}
        </button>
      </div>
      <AuthErrorMessage error={error} />
      <Button type="submit" disabled={isPending}>
        {t('auth.signIn')}
      </Button>
    </form>
  );
}
