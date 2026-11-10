import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@/shared/ui/icons';
import { useMenu } from '@/shared/ui/useMenu';
import { READING_STATUSES, type ReadingStatus } from '../library';

export interface StatusMenuProps {
  /** Current status, or `null` when the book is not in the library. */
  status: ReadingStatus | null;
  isBusy: boolean;
  onSelect: (status: ReadingStatus) => void;
  /** Shown only for books in the library. */
  onRemove: () => void;
}

/** Status button with a menu: pick a status (adds the book when needed) or remove it from the library. */
export function StatusMenu({ status, isBusy, onSelect, onRemove }: StatusMenuProps) {
  const { t } = useTranslation();
  const { isOpen, containerRef, choose, buttonProps, menuProps } = useMenu();

  return (
    <div ref={containerRef} className="relative">
      <button
        {...buttonProps}
        aria-label={`${t('books.statusMenu')}: ${status ? t(`books.status.${status}`) : t('books.addToLibrary')}`}
        disabled={isBusy}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md bg-accent px-3.5 text-sm font-bold text-on-accent hover:bg-accent-hover disabled:opacity-60"
      >
        {status ? t(`books.status.${status}`) : t('books.addToLibrary')}
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <ul
          {...menuProps}
          aria-label={t('books.statusMenu')}
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border-strong bg-surface py-1 shadow-lg"
        >
          {READING_STATUSES.map((option) => (
            <li key={option} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option === status}
                tabIndex={-1}
                onClick={() => choose(() => option !== status && onSelect(option))}
                className="flex min-h-11 w-full items-center px-3.5 text-left text-sm text-fg hover:bg-surface-muted focus:bg-surface-muted focus:outline-none aria-checked:font-bold aria-checked:text-accent"
              >
                {t(`books.status.${option}`)}
              </button>
            </li>
          ))}
          {status && (
            <li role="none" className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => choose(onRemove)}
                className="flex min-h-11 w-full items-center px-3.5 text-left text-sm text-danger hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
              >
                {t('books.removeFromLibrary')}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
