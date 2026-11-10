import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLoadLibraryRepository } from './libraryContextValue';
import { moveShelf, nextShelfOrder, shelfKey, type Shelf, type ShelfFilter } from './shelves';
import { invalidateLists, libraryQueryKeys, requireUid, useUid } from './useLibrary';

/** Most books loaded for one shelf (sorted in memory, see `listBooks`). */
export const SHELF_BOOKS_LIMIT = 300;
/** Shelves, lists and counts change only through this app, which refreshes them; a few minutes of cache is safe. */
const SHELF_STALE_TIME_MS = 5 * 60 * 1000;

/** The user's custom shelves, in order. */
export function useShelves() {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.shelves(uid ?? ''),
    queryFn: async () => (await loadRepository()).listShelves(requireUid(uid)),
    enabled: uid !== null,
    staleTime: SHELF_STALE_TIME_MS,
  });
}

/** Books on a shelf, most recently updated first. */
export function useShelfBooks(filter: ShelfFilter | null) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const key = filter ? shelfKey(filter) : '';

  return useQuery({
    queryKey: libraryQueryKeys.list(uid ?? '', key),
    queryFn: async () =>
      // `enabled` guarantees a filter here.
      (await loadRepository()).listBooks(requireUid(uid), { filter: filter as ShelfFilter, limit: SHELF_BOOKS_LIMIT }),
    enabled: uid !== null && filter !== null,
    staleTime: SHELF_STALE_TIME_MS,
  });
}

/** How many books are on a shelf. */
export function useShelfCount(filter: ShelfFilter) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.count(uid ?? '', shelfKey(filter)),
    queryFn: async () => (await loadRepository()).countBooks(requireUid(uid), filter),
    enabled: uid !== null,
    staleTime: SHELF_STALE_TIME_MS,
  });
}

function useShelfMutationContext() {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();
  const shelvesKey = () => libraryQueryKeys.shelves(requireUid(uid));
  const currentShelves = () => queryClient.getQueryData<Shelf[]>(shelvesKey()) ?? [];
  const setShelves = (update: (shelves: Shelf[]) => Shelf[]) =>
    queryClient.setQueryData<Shelf[]>(shelvesKey(), (shelves) => update(shelves ?? []));
  return { uid, loadRepository, queryClient, shelvesKey, currentShelves, setShelves };
}

/** Creates a shelf at the end of the list (the name must already be valid, see `validateShelfName`). */
export function useCreateShelf() {
  const { uid, loadRepository, currentShelves, setShelves } = useShelfMutationContext();

  return useMutation({
    mutationFn: async (name: string) =>
      (await loadRepository()).createShelf(requireUid(uid), { name, order: nextShelfOrder(currentShelves()) }),
    onSuccess: (shelf) => setShelves((shelves) => [...shelves, shelf]),
  });
}

export function useRenameShelf() {
  const { uid, loadRepository, setShelves } = useShelfMutationContext();

  return useMutation({
    mutationFn: async ({ shelfId, name }: { shelfId: string; name: string }) =>
      (await loadRepository()).renameShelf(requireUid(uid), shelfId, name),
    onSuccess: (_result, { shelfId, name }) =>
      setShelves((shelves) => shelves.map((shelf) => (shelf.id === shelfId ? { ...shelf, name } : shelf))),
  });
}

/** Moves a shelf one place up or down; the list changes at once and goes back if saving fails. */
export function useMoveShelf() {
  const { uid, loadRepository, queryClient, shelvesKey, currentShelves, setShelves } = useShelfMutationContext();

  return useMutation({
    mutationFn: async (orders: { id: string; order: number }[]) =>
      (await loadRepository()).reorderShelves(requireUid(uid), orders),
    onMutate: (orders) => {
      const previous = currentShelves();
      const byId = new Map(orders.map(({ id, order }) => [id, order]));
      setShelves((shelves) =>
        shelves.map((shelf) => ({ ...shelf, order: byId.get(shelf.id) ?? shelf.order })).sort((a, b) => a.order - b.order),
      );
      return { previous };
    },
    onError: (_error, _orders, context) => {
      if (context) queryClient.setQueryData(shelvesKey(), context.previous);
    },
  });
}

/** The orders to save for moving `shelfId` (empty when it can't move). */
export function useShelfMove() {
  const { currentShelves } = useShelfMutationContext();
  const move = useMoveShelf();
  const moveBy = (shelfId: string, direction: -1 | 1) => {
    const orders = moveShelf(currentShelves(), shelfId, direction);
    if (orders.length > 0) move.mutate(orders);
  };
  return { ...move, moveBy };
}

/** Deletes a shelf; books stay in the library, so their pages and the shelf lists are refreshed. */
export function useDeleteShelf() {
  const { uid, loadRepository, queryClient, setShelves } = useShelfMutationContext();

  return useMutation({
    mutationFn: async (shelfId: string) => (await loadRepository()).deleteShelf(requireUid(uid), shelfId),
    onSuccess: async (_result, shelfId) => {
      const owner = requireUid(uid);
      setShelves((shelves) => shelves.filter((shelf) => shelf.id !== shelfId));
      queryClient.removeQueries({ queryKey: libraryQueryKeys.list(owner, shelfId) });
      queryClient.removeQueries({ queryKey: libraryQueryKeys.count(owner, shelfId) });
      await Promise.all([
        invalidateLists(queryClient, owner),
        queryClient.invalidateQueries({
          queryKey: libraryQueryKeys.all(owner),
          predicate: (query) => query.queryKey[2] === 'book',
        }),
      ]);
    },
  });
}
