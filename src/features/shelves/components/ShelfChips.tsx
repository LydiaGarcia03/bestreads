import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buildShelfPath, shelfKey, useShelfCount } from '@/features/books/lazy';
import type { ShelfOption } from '../useShelfOptions';

export interface ShelfChipsProps {
  options: readonly ShelfOption[];
  /** `shelfKey` of the current shelf. */
  selected: string;
  /** Screen the chips switch the shelf on (`?shelf=`); the shelves screen by default. */
  path?: string;
}

/** Filter chips, one per shelf, with its book count; the current one is highlighted. */
export function ShelfChips({ options, selected, path }: ShelfChipsProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('shelves.chooseShelf')}>
      <ul className="-mx-5 scrollbar-none flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {options.map((option) => (
          <li key={shelfKey(option.filter)} className="shrink-0">
            <ShelfChip option={option} isSelected={shelfKey(option.filter) === selected} path={path} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ShelfChip({ option, isSelected, path }: { option: ShelfOption; isSelected: boolean; path?: string }) {
  const count = useShelfCount(option.filter);

  return (
    <Link
      to={buildShelfPath(option.filter, path)}
      replace
      aria-current={isSelected ? 'page' : undefined}
      className={`flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap lg:h-8 ${
        isSelected
          ? 'border-chip-active bg-chip-active font-bold text-on-chip-active hover:text-on-chip-active'
          : 'border-border-strong bg-surface text-fg hover:border-accent hover:text-fg'
      }`}
    >
      {option.name}
      {count.data !== undefined && (
        <>
          {/* A text node of its own: keeps "Read · 2" apart in the accessible name (flex hides it visually). */}{' '}
          <span className={isSelected ? '' : 'text-fg-muted'}>· {count.data}</span>
        </>
      )}
    </Link>
  );
}
