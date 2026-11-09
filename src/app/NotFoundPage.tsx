import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageHeading } from '@/shared/ui/PageHeading';
import { PATHS } from './paths';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-start gap-3">
      <PageHeading>{t('pages.notFound.title')}</PageHeading>
      <p className="text-fg-muted">{t('pages.notFound.description')}</p>
      <Link to={PATHS.home} className="font-bold">
        {t('pages.notFound.backHome')}
      </Link>
    </section>
  );
}
