import { useTranslation } from 'react-i18next';
import { DownloadIcon } from '@/shared/ui/icons';
import { promptInstall } from '../installPrompt';
import { useCanInstall } from '../usePwa';

/** "Install app" in the top bar, only while the browser offers installing (and it isn't installed). */
export function InstallAppButton() {
  const { t } = useTranslation();
  const canInstall = useCanInstall();
  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      aria-label={t('pwa.install')}
      className="flex size-11 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-bold text-fg hover:text-accent lg:size-auto lg:h-11 lg:bg-bg lg:px-4"
    >
      <DownloadIcon size={18} />
      <span className="hidden lg:inline">{t('pwa.install')}</span>
    </button>
  );
}
