import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { UsernameAlreadySetError, UsernameTakenError } from '../types';
import { useClaimUsername } from '../usePublicProfile';
import { USERNAME_LIMITS, validateUsername, type UsernameError } from '../username';

type FormError = UsernameError | 'taken' | 'alreadySet' | 'saveFailed';

function claimError(error: unknown): FormError {
  if (error instanceof UsernameTakenError) return 'taken';
  if (error instanceof UsernameAlreadySetError) return 'alreadySet';
  return 'saveFailed';
}

/** Username field with an `@` prefix; validates, then claims the username (it can't be changed later). */
export function UsernameForm() {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState<UsernameError | null>(null);
  const claim = useClaimUsername();

  const error: FormError | null = validationError ?? (claim.isError ? claimError(claim.error) : null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateUsername(value);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    setValidationError(null);
    claim.mutate(result.username);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-bold">
        {t('social.usernameLabel')}
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-border-strong bg-surface focus-within:border-accent">
          <span aria-hidden="true" className="pl-3 text-fg-muted">
            @
          </span>
          <input
            id={inputId}
            value={value}
            maxLength={USERNAME_LIMITS.max + 1}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value);
              setValidationError(null);
              claim.reset();
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="h-full min-w-0 flex-1 bg-transparent pr-3 pl-0.5 text-fg outline-none"
          />
        </div>
        <Button type="submit" disabled={claim.isPending}>
          {claim.isPending ? t('social.claiming') : t('social.claim')}
        </Button>
      </div>
      <p id={hintId} className="text-xs text-fg-muted">
        {t('social.usernameHint', USERNAME_LIMITS)}
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-bold text-danger">
          {t(`social.errors.${error}`, USERNAME_LIMITS)}
        </p>
      )}
    </form>
  );
}
