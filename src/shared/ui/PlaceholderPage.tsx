import { useTranslation } from 'react-i18next';
import { PageHeading } from './PageHeading';

/** Temporary screen body for routes whose feature belongs to a later phase. */
export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-2">
      <PageHeading>{title}</PageHeading>
      <p className="text-fg-muted">{t('common.comingSoon')}</p>
    </section>
  );
}
