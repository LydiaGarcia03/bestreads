import type { VolumeState } from '../seriesTimeline';

/** Dot per state: filled = read, ring = reading, outlined = not read (dashed when not in the library). */
const DOT: Record<VolumeState, string> = {
  read: 'size-3 bg-accent',
  reading: 'size-4 border-[3px] border-accent bg-surface',
  unread: 'size-3 border-2 border-fg-muted',
  notInLibrary: 'size-3 border-2 border-dashed border-fg-muted',
};

/** Decorative: the state is also given as text next to it. */
export function SeriesDot({ state }: { state: VolumeState }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-full ${DOT[state]}`} />;
}
