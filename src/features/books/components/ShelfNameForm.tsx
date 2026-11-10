import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { SHELF_LIMITS, validateShelfName, type Shelf, type ShelfNameError } from '../shelves';

export interface ShelfNameFormProps {
  /** Visible label of the name field. */
  label: string;
  submitLabel: string;
  /** Existing shelves, to refuse a duplicate name. */
  shelves: readonly Shelf[];
  /** When renaming: the shelf's id (its own name is allowed) and current name. */
  shelfId?: string;
  initialName?: string;
  isBusy?: boolean;
  /** Focus the field when it appears (it was opened on purpose, e.g. "Rename" or "+ New shelf"). */
  autoFocus?: boolean;
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}

/** Name field for a new or renamed shelf, with validation messages (see `validateShelfName`). */
export function ShelfNameForm({
  label,
  submitLabel,
  shelves,
  shelfId,
  initialName = '',
  isBusy = false,
  autoFocus = false,
  onSubmit,
  onCancel,
}: ShelfNameFormProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const errorId = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<ShelfNameError | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateShelfName(name, shelves, shelfId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onSubmit(result.name);
    if (!shelfId) setName('');
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-xs text-fg-muted">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={inputId}
          value={name}
          maxLength={SHELF_LIMITS.name}
          autoComplete="off"
          autoFocus={autoFocus}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && onCancel) {
              event.preventDefault();
              onCancel();
            }
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className="h-11 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none lg:h-9"
        />
        <Button type="submit" disabled={isBusy} className="lg:h-9">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="lg:h-9">
            {t('books.cancel')}
          </Button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs font-bold text-danger">
          {t(`shelves.errors.${error}`, { max: SHELF_LIMITS.name })}
        </p>
      )}
    </form>
  );
}
