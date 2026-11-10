import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';

interface ConfirmActionProps {
  /** The button that starts the action, e.g. "Remove". */
  label: string;
  /** Accessible name of the start button and of the confirmation group. */
  accessibleLabel: string;
  /** Shown before the final button, saying what will happen. */
  question: string;
  pendingLabel: string;
  isPending: boolean;
  errorText: string | null;
  onConfirm: () => void;
}

/** A destructive action asked twice: the first button shows the question, "Cancel" and the final button. */
export function ConfirmAction({
  label,
  accessibleLabel,
  question,
  pendingLabel,
  isPending,
  errorText,
  onConfirm,
}: ConfirmActionProps) {
  const { t } = useTranslation();
  const [isAsking, setIsAsking] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2">
      {isAsking ? (
        <div role="group" aria-label={accessibleLabel} className="flex flex-col items-start gap-2">
          <p className="text-sm">{question}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={isPending} onClick={() => setIsAsking(false)}>
              {t('books.cancel')}
            </Button>
            <Button variant="danger" disabled={isPending} onClick={onConfirm}>
              {isPending ? pendingLabel : label}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" aria-label={accessibleLabel} onClick={() => setIsAsking(true)}>
          {label}
        </Button>
      )}
      {errorText && (
        <p role="alert" className="text-xs font-bold text-danger">
          {errorText}
        </p>
      )}
    </div>
  );
}
