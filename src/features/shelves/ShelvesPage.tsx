import { useTranslation } from 'react-i18next';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

/** Shelves screen. Implemented in Phase 2. */
export function ShelvesPage() {
  const { t } = useTranslation();
  return <PlaceholderPage title={t('pages.shelves.title')} />;
}
