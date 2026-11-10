import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLoadLibraryRepository } from './libraryContextValue';
import { applyOptimistically, libraryQueryKeys, requireUid, useUid } from './useLibrary';

/** A cover only changes through this app, which updates the cache; no need to read it again. */
const COVER_STALE_TIME_MS = Number.POSITIVE_INFINITY;

/** The owner's cover photo (`null` when none). Only requested when `enabled` (the book has one). */
export function usePersonalCover(bookId: string, { enabled }: { enabled: boolean }) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.cover(uid ?? '', bookId),
    queryFn: async () => (await loadRepository()).getPersonalCover(requireUid(uid), bookId),
    enabled: enabled && uid !== null,
    staleTime: COVER_STALE_TIME_MS,
  });
}

/** Saves a resized cover photo, or removes it with `null`; the book shows it everywhere at once. */
export function useSavePersonalCover(bookId: string) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dataUrl: string | null) =>
      (await loadRepository()).savePersonalCover(requireUid(uid), bookId, dataUrl),
    onSuccess: async (_result, dataUrl) => {
      const owner = requireUid(uid);
      queryClient.setQueryData(libraryQueryKeys.cover(owner, bookId), dataUrl);
      await applyOptimistically(queryClient, owner, bookId, { hasPersonalCover: dataUrl !== null });
    },
  });
}
