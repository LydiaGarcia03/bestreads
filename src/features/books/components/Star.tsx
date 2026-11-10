import { StarIcon } from '@/shared/ui/icons';

export interface StarProps {
  /** 0 (empty) to 1 (full); partial values show a clipped fill from the left. */
  fill: number;
  size: number;
}

/** One rating star: an empty star with the filled part drawn over it (3.75 → the 4th star at 75%). */
export function Star({ fill, size }: StarProps) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <StarIcon size={size} className="text-star-empty" />
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <StarIcon size={size} className="max-w-none text-star" />
        </span>
      )}
    </span>
  );
}
