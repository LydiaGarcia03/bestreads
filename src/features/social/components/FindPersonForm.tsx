import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { buildProfilePath } from '../profilePath';
import { normalizeUsername } from '../username';

/** Finds a person by their exact @username: opens their profile, which says when nobody has it. */
export function FindPersonForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = normalizeUsername(value);
    if (username.length === 0) {
      setIsEmpty(true);
      return;
    }
    navigate(buildProfilePath(username));
  };

  return (
    <form role="search" aria-label={t('social.find.title')} onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-bold">
        {t('social.find.label')}
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-border-strong bg-surface focus-within:border-accent">
          <span aria-hidden="true" className="pl-3 text-fg-muted">
            @
          </span>
          <input
            id={inputId}
            value={value}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value);
              setIsEmpty(false);
            }}
            aria-invalid={isEmpty}
            aria-describedby={isEmpty ? errorId : undefined}
            className="h-full min-w-0 flex-1 bg-transparent pr-3 pl-0.5 text-fg outline-none"
          />
        </div>
        <Button type="submit" variant="secondary">
          {t('social.find.submit')}
        </Button>
      </div>
      {isEmpty && (
        <p id={errorId} role="alert" className="text-xs font-bold text-danger">
          {t('social.errors.empty')}
        </p>
      )}
    </form>
  );
}
