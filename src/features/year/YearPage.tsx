import { useTranslation } from 'react-i18next';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

/** My Year screen. Implemented in Phase 7. */
export function YearPage() {
  const { t } = useTranslation();
  return <PlaceholderPage title={t('pages.year.title')} />;
}
