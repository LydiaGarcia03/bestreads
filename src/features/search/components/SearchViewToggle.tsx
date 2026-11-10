import { useTranslation } from 'react-i18next';
import { GridIcon, ListIcon } from '@/shared/ui/icons';
import { SEARCH_VIEWS, type SearchView } from '../searchView';

const ICONS = { list: ListIcon, grid: GridIcon } as const;

/** Two toggle buttons: list (details) or grid (covers). */
export function SearchViewToggle({ view, onChange }: { view: SearchView; onChange: (view: SearchView) => void }) {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t('search.view.label')} className="inline-flex shrink-0 rounded-md border border-border-strong bg-surface p-0.5">
      {SEARCH_VIEWS.map((option) => {
        const ViewIcon = ICONS[option];
        return (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            title={t(`search.view.${option}`)}
            onClick={() => onChange(option)}
            className="flex size-10 items-center justify-center rounded text-fg-muted hover:text-fg aria-pressed:bg-chip-active aria-pressed:text-on-chip-active"
          >
            <ViewIcon />
            <span className="sr-only">{t(`search.view.${option}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
