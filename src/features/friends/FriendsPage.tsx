import { useTranslation } from 'react-i18next';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

/** Friends screen. Implemented in Phase 6. */
export function FriendsPage() {
  const { t } = useTranslation();
  return <PlaceholderPage title={t('pages.friends.title')} />;
}
