import { useTranslation } from 'react-i18next';
import { applyUpdate, dismissUpdate } from '../serviceWorker';
import { useIsOnline, useUpdateWaiting } from '../usePwa';

/** Offline notice and "new version" prompt, shown above the page content. */
export function PwaBanners() {
  const { t } = useTranslation();
  const isOnline = useIsOnline();
  const updateWaiting = useUpdateWaiting();

  if (isOnline && !updateWaiting) return null;

  return (
    <div className="flex flex-col gap-2">
      {!isOnline && (
        <p role="status" className="rounded-md border border-banner-border bg-banner px-4 py-2.5 text-sm text-on-banner">
          {t('pwa.offline')}
        </p>
      )}
      {updateWaiting && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-banner-border bg-banner px-4 py-2.5 text-sm text-on-banner"
        >
          <p className="flex-1">{t('pwa.updateReady')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={dismissUpdate}
              className="min-h-11 rounded-md px-3 font-bold text-on-banner hover:underline lg:min-h-8"
            >
              {t('pwa.later')}
            </button>
            <button
              type="button"
              onClick={() => void applyUpdate()}
              className="min-h-11 rounded-md bg-banner-icon px-3 font-bold text-banner lg:min-h-8"
            >
              {t('pwa.reload')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
