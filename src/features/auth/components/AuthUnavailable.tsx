import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';

/** Shown when the auth backend can't be loaded, instead of a blank screen. */
export function AuthUnavailable() {
  const { t } = useTranslation();

  return (
    <section role="alert" className="mx-auto flex max-w-sm flex-col items-start gap-3 py-8">
      <h1 className="text-xl font-bold">{t('auth.unavailable.title')}</h1>
      <p className="text-fg-muted">{t('auth.unavailable.description')}</p>
      <Button onClick={() => window.location.reload()}>{t('auth.unavailable.reload')}</Button>
    </section>
  );
}
