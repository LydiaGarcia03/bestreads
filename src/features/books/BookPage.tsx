import { useTranslation } from 'react-i18next';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

/** Book screen (`/book/:bookId`). Implemented in Phase 2. */
export function BookPage() {
  const { t } = useTranslation();
  return <PlaceholderPage title={t('pages.book.title')} />;
}
