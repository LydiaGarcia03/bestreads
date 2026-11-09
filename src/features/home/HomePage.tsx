import { useTranslation } from 'react-i18next';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

/** Home screen. "Currently reading" and shelves arrive in Phase 2. */
export function HomePage() {
  const { t } = useTranslation();
  return <PlaceholderPage title={t('pages.home.title')} />;
}
