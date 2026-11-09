import { useTranslation } from 'react-i18next';
import type { VisibleAuthErrorKind } from '../authErrors';

export function AuthErrorMessage({ error }: { error: VisibleAuthErrorKind | null }) {
  const { t } = useTranslation();
  if (!error) return null;

  return (
    <p role="alert" className="text-sm font-bold text-danger">
      {t(`auth.errors.${error}`)}
    </p>
  );
}
