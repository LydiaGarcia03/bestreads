import { useTranslation } from 'react-i18next';
import { useShelves, type ShelfFilter } from '@/features/books/lazy';
import { FIXED_SHELVES } from './fixedShelves';

export interface ShelfOption {
  filter: ShelfFilter;
  name: string;
}

/** Every shelf with its display name: the fixed ones first, then the user's shelves in their order. */
export function useShelfOptions() {
  const { t } = useTranslation();
  const shelves = useShelves();

  const options: ShelfOption[] = [
    ...FIXED_SHELVES.map((filter) => ({
      filter,
      name: filter.kind === 'status' ? t(`books.status.${filter.status}`) : '',
    })),
    ...(shelves.data ?? []).map((shelf) => ({ filter: { kind: 'custom', shelfId: shelf.id } as const, name: shelf.name })),
  ];

  return { options, shelves };
}
