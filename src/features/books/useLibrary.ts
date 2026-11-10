import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { CatalogBook } from '@/features/catalog';
import { useAuth } from '@/features/auth';
import type { LibraryBook, ReadingStatus } from './library';
import { useLoadLibraryRepository } from './libraryContextValue';
import { statusChangePatch, toCalendarDay, type LibraryBookPatch } from './reads';
import type { RatingChange } from './types';

export const libraryQueryKeys = {
  all: (uid: string) => ['library', uid] as const,
  book: (uid: string, bookId: string) => ['library', uid, 'book', bookId] as const,
  /** Books on a shelf; `shelf` is a `shelfKey`. */
  list: (uid: string, shelf: string) => ['library', uid, 'list', shelf] as const,
  count: (uid: string, shelf: string) => ['library', uid, 'count', shelf] as const,
  shelves: (uid: string) => ['library', uid, 'shelves'] as const,
};

/** The signed-in user's id, or `null` while auth is still loading (queries wait for it). */
export function useUid(): string | null {
  const auth = useAuth();
  return auth.status === 'signedIn' ? auth.user.uid : null;
}

export function requireUid(uid: string | null): string {
  if (!uid) throw new Error('Library changes need a signed-in user');
  return uid;
}

const SHELF_CONTENT_QUERIES = new Set(['list', 'count']);

/** Shelf lists and counts show a book's new status, shelves or removal on the next visit. */
export function invalidateLists(queryClient: QueryClient, uid: string) {
  return queryClient.invalidateQueries({
    queryKey: libraryQueryKeys.all(uid),
    predicate: (query) => SHELF_CONTENT_QUERIES.has(String(query.queryKey[2])),
  });
}

/** The user's copy of the book (`data` is `null` when it isn't in the library). */
export function useLibraryBook(bookId: string) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.book(uid ?? '', bookId),
    queryFn: async () => (await loadRepository()).getBook(requireUid(uid), bookId),
    enabled: uid !== null,
  });
}

/** Today as a local calendar day; read when a change is made, so it is right after midnight too. */
const today = () => toCalendarDay(new Date());

export function useAddToLibrary() {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ book, status }: { book: CatalogBook; status: ReadingStatus }) =>
      (await loadRepository()).addBook(requireUid(uid), book, status, today()),
    onSuccess: async (added) => {
      const owner = requireUid(uid);
      queryClient.setQueryData<LibraryBook | null>(libraryQueryKeys.book(owner, added.id), added);
      await invalidateLists(queryClient, owner);
    },
  });
}

const isShelfList = (query: { queryKey: readonly unknown[] }) => query.queryKey[2] === 'list';

/**
 * Shows a change to a book at once, on its page and in every cached shelf list (Home cards, shelves),
 * and returns how to undo it if the write fails. Pending reads are cancelled so they can't overwrite it.
 */
async function applyOptimistically(queryClient: QueryClient, uid: string, bookId: string, change: Partial<LibraryBook>) {
  const key = libraryQueryKeys.book(uid, bookId);
  const lists = { queryKey: libraryQueryKeys.all(uid), predicate: isShelfList };
  await Promise.all([queryClient.cancelQueries({ queryKey: key }), queryClient.cancelQueries(lists)]);

  const previousBook = queryClient.getQueryData<LibraryBook | null>(key);
  const previousLists = queryClient.getQueriesData<LibraryBook[]>(lists);
  queryClient.setQueryData<LibraryBook | null>(key, (current) => (current ? { ...current, ...change } : current));
  queryClient.setQueriesData<LibraryBook[]>(lists, (books) =>
    books?.map((book) => (book.id === bookId ? { ...book, ...change } : book)),
  );

  return {
    undo: () => {
      queryClient.setQueryData(key, previousBook);
      previousLists.forEach(([listKey, books]) => queryClient.setQueryData(listKey, books));
    },
  };
}

/** Changes status, progress, reads or shelves; shown at once everywhere and undone if the write fails. */
export function useUpdateBook() {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, patch }: { bookId: string; patch: LibraryBookPatch }) =>
      (await loadRepository()).updateBook(requireUid(uid), bookId, patch),
    onMutate: ({ bookId, patch }) => applyOptimistically(queryClient, requireUid(uid), bookId, patch),
    onError: (_error, _variables, context) => context?.undo(),
    onSuccess: async (_result, { patch }) => {
      // Moving between shelves changes which lists hold the book, so those are fetched again.
      if (patch.status || patch.shelfIds) await invalidateLists(queryClient, requireUid(uid));
    },
  });
}

/** Moves the book to `status`, updating its reads (and progress, for a re-read) to match. */
export function useChangeStatus() {
  const updateBook = useUpdateBook();
  const changeStatus = (book: LibraryBook, status: ReadingStatus) =>
    updateBook.mutate({ bookId: book.id, patch: statusChangePatch(book, status, today()) });
  return { ...updateBook, changeStatus };
}

/**
 * Saves the rating and its public flag. The book page shows the change at once (optimistic) and
 * goes back to the saved value if the write fails.
 */
export function useUpdateRating() {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ book, change }: { book: LibraryBook; change: RatingChange }) =>
      (await loadRepository()).updateRating(requireUid(uid), book, change),
    onMutate: ({ book, change }) => applyOptimistically(queryClient, requireUid(uid), book.id, change),
    onError: (_error, _variables, context) => context?.undo(),
  });
}

export function useRemoveFromLibrary() {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => (await loadRepository()).removeBook(requireUid(uid), bookId),
    onSuccess: async (_result, bookId) => {
      const owner = requireUid(uid);
      queryClient.setQueryData<LibraryBook | null>(libraryQueryKeys.book(owner, bookId), null);
      await invalidateLists(queryClient, owner);
    },
  });
}
