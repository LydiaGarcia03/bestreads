import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { CARD_SIZE } from '../shareMethod';
import { useShareCard } from '../useShareCard';

/** The card preview is shown smaller than its real size, so it fits a phone screen. */
const PREVIEW_SCALE = 0.75;

interface ShareDialogProps {
  /** Dialog heading, e.g. "Share this book". */
  heading: string;
  /** Title passed to the share sheet. */
  shareTitle: string;
  fileName: string;
  onClose: () => void;
  /** The card, drawn at `CARD_SIZE`. */
  children: ReactNode;
}

/** Previews a share card and shares it (phones) or downloads it as a PNG (desktop). */
export function ShareDialog({ heading, shareTitle, fileName, onClose, children }: ShareDialogProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const share = useShareCard({ fileName, title: shareTitle });

  useEffect(() => {
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
        className="flex max-h-[90dvh] w-full flex-col items-center gap-4 overflow-y-auto rounded-t-lg bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl outline-none sm:max-w-md sm:rounded-lg sm:pb-5"
      >
        <h2 id={headingId} className="self-start text-lg font-bold">
          {heading}
        </h2>

        <div
          className="shrink-0 overflow-hidden rounded-md shadow-md"
          style={{ width: CARD_SIZE.width * PREVIEW_SCALE, height: CARD_SIZE.height * PREVIEW_SCALE }}
        >
          <div className="origin-top-left" style={{ transform: `scale(${PREVIEW_SCALE})` }}>
            <div ref={cardRef} style={{ width: CARD_SIZE.width, height: CARD_SIZE.height }}>
              {children}
            </div>
          </div>
        </div>

        {share.isError && (
          <p role="alert" className="text-sm font-bold text-danger">
            {t('share.error')}
          </p>
        )}
        {share.data === 'download' && (
          <p role="status" className="text-sm text-fg-muted">
            {t('share.downloaded')}
          </p>
        )}

        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('share.close')}
          </Button>
          <Button
            disabled={share.isPending}
            onClick={() => {
              if (cardRef.current) share.mutate(cardRef.current);
            }}
          >
            {share.isPending ? t('share.preparing') : t(share.method === 'share' ? 'share.share' : 'share.download')}
          </Button>
        </div>
      </div>
    </div>
  );
}
