import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PATHS } from '../paths';

/**
 * "bestreads" wordmark linking to Home. The visible text is a logo (not translated);
 * the accessible name comes from i18n.
 */
export function Logo() {
  const { t } = useTranslation();

  return (
    <Link
      to={PATHS.home}
      aria-label={t('header.home')}
      className="shrink-0 font-serif text-[22px] font-bold tracking-tight text-fg hover:text-fg lg:text-2xl"
    >
      <span aria-hidden="true">
        best<span className="text-accent">reads</span>
      </span>
    </Link>
  );
}
