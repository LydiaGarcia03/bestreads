import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLoadLibraryRepository } from './libraryContextValue';
import { normalizeReview, type Review } from './review';
import { libraryQueryKeys, requireUid, useUid } from './useLibrary';

/** The owner's review of a library book (`data` is `null` when there is none). */
export function useReview(bookId: string) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.review(uid ?? '', bookId),
    queryFn: async () => (await loadRepository()).getReview(requireUid(uid), bookId),
    enabled: uid !== null,
  });
}

/** Saves the review (trimmed; empty deletes it) and updates the cached copy. */
export function useSaveReview(bookId: string) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const normalized = normalizeReview(text);
      await (await loadRepository()).saveReview(requireUid(uid), bookId, normalized);
      return normalized;
    },
    onSuccess: (text) => {
      const review: Review | null = text ? { text, updatedAt: new Date() } : null;
      queryClient.setQueryData(libraryQueryKeys.review(requireUid(uid), bookId), review);
    },
  });
}
