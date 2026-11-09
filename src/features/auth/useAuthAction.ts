import { useCallback, useState } from 'react';
import { isVisibleAuthError, toAuthError, type VisibleAuthErrorKind } from './authErrors';

export interface UseAuthActionResult {
  isPending: boolean;
  error: VisibleAuthErrorKind | null;
  /** Runs an auth action, tracking pending state and errors. Resolves to `true` on success. */
  run: (action: () => Promise<void>) => Promise<boolean>;
  clearError: () => void;
}

export function useAuthAction(): UseAuthActionResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<VisibleAuthErrorKind | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    setIsPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      const { kind } = toAuthError(caught);
      // A closed popup is the user's choice, so there is nothing to report.
      if (isVisibleAuthError(kind)) setError(kind);
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isPending, error, run, clearError };
}
