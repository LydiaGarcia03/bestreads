import { useState } from 'react';
import type { PublicProfile } from '../publicProfile';

/** Profile photo, or the first letter of the name (or username) when there is none or it fails to load. */
export function Avatar({ profile, className = 'size-16 text-2xl' }: { profile: PublicProfile; className?: string }) {
  const [hasFailed, setHasFailed] = useState(false);
  const initial = (profile.displayName ?? profile.username).charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted font-serif font-bold text-fg-muted ${className}`}
    >
      {profile.photoURL && !hasFailed ? (
        <img
          src={profile.photoURL}
          alt=""
          // Google profile photos refuse some referrers.
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
