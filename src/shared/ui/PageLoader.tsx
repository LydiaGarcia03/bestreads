import { useTranslation } from 'react-i18next';

/** Suspense fallback while a route chunk loads. */
export function PageLoader() {
  const { t } = useTranslation();

  return (
    <p role="status" className="py-8 text-center text-sm text-fg-muted">
      {t('common.loading')}
    </p>
  );
}
