import { useMutation, useQuery } from '@tanstack/react-query';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { canShareFiles, downloadFile, loadShareableImage, renderPng, shareFile } from './shareApi';
import { chooseShareMethod, type ShareMethod } from './shareMethod';

/** What happened to the card: shared, downloaded, or nothing (share sheet closed). */
export type ShareOutcome = ShareMethod | 'cancelled';

/** Covers don't change; keep each loaded one for the session. */
const IMAGE_STALE_TIME_MS = Number.POSITIVE_INFINITY;

/** A cover ready for a card: a data URL, `null` when it can't be used (or there is none). */
export function useShareableImage(url: string | null) {
  return useQuery({
    queryKey: ['share', 'image', url],
    queryFn: () => (url ? loadShareableImage(url) : Promise.resolve(null)),
    staleTime: IMAGE_STALE_TIME_MS,
  });
}

/** Renders a card node to PNG, then shares it (phones) or downloads it (desktop). */
export function useShareCard({ fileName, title }: { fileName: string; title: string }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const mutation = useMutation({
    mutationFn: async (node: HTMLElement): Promise<ShareOutcome> => {
      const blob = await renderPng(node);
      const file = new File([blob], fileName, { type: 'image/png' });
      const method = chooseShareMethod({ isDesktop, canShareFiles: canShareFiles(file) });
      if (method === 'download') {
        downloadFile(file);
        return 'download';
      }
      return (await shareFile(file, title)) ? 'share' : 'cancelled';
    },
  });

  return { ...mutation, method: isDesktop ? ('download' as const) : ('share' as const) };
}
