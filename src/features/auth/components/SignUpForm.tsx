import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { useAuthActions } from '../AuthContext';
import { DISPLAY_NAME_MAX_LENGTH, MIN_PASSWORD_LENGTH } from '../credentials';
import { useAuthAction } from '../useAuthAction';
import { AuthErrorMessage } from './AuthErrorMessage';
import { readTextField } from './formValues';

export function SignUpForm() {
  const { t } = useTranslation();
  const { signUpWithEmail } = useAuthActions();
  const { isPending, error, run } = useAuthAction();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    void run(() =>
      signUpWithEmail({
        displayName: readTextField(form, 'name'),
        email: readTextField(form, 'email'),
        password: readTextField(form, 'password'),
      }),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField label={t('auth.name')} name="name" autoComplete="name" maxLength={DISPLAY_NAME_MAX_LENGTH} required />
      <TextField label={t('auth.email')} name="email" type="email" autoComplete="email" required />
      <TextField
        label={t('auth.password')}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        hint={t('auth.passwordHint', { min: MIN_PASSWORD_LENGTH })}
        required
      />
      <AuthErrorMessage error={error} />
      <Button type="submit" disabled={isPending}>
        {t('auth.signUp')}
      </Button>
    </form>
  );
}
