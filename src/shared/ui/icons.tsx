import type { ReactNode, SVGProps } from 'react';

/** Decorative stroke icons (paths from `docs/mocks/`). Always hidden from assistive tech. */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
}

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Language: a Latin "A" next to a CJK-style glyph (the common "translate" sign). */
export function LanguageIcon(props: IconProps) {
  return (
    <Icon size={18} {...props}>
      <path d="M3 5h9M7.5 3v2M10 5c-.7 3.6-3 6.6-6 8.5M5.5 8.5c1.3 2.2 3.3 3.8 5.5 4.5" />
      <path d="M12.5 21l4.25-10L21 21M14 17.5h5.5" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon size={18} {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </Icon>
  );
}

/** Three book spines, one leaning (as in the logo). Used where a book has no cover. */
export function BooksIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4h5v16H4zM10 4h5v16h-5zM16 5l4 1-3 15-4-1z" />
    </Icon>
  );
}

/** A stack of three books lying down, each a different length, with a band on the spine. */
export function ShelvesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="16" width="18" height="5" rx="1" />
      <rect x="5" y="11" width="15" height="5" rx="1" />
      <rect x="4" y="6" width="13" height="5" rx="1" />
      <path d="M7 16v5M16.5 11v5M7.5 6v5" />
    </Icon>
  );
}

export function FriendsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c1-3.5 3.3-5 6-5s5 1.5 6 5M15 15c2.5 0 4.5 1.3 5.5 4" />
    </Icon>
  );
}

/** Calendar with a star: the year in review. */
export function YearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path
        d="M12 12l.88 2.29 2.45.13-1.9 1.54.63 2.37L12 17l-2.06 1.33.63-2.37-1.9-1.54 2.45-.13z"
        fill="currentColor"
        strokeWidth={1}
      />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon size={16} strokeWidth={2.5} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

/** Solid five-point star (filled with the text color). */
export function StarIcon(props: IconProps) {
  return (
    <Icon fill="currentColor" stroke="none" {...props}>
      <path d="M12 2.2l2.95 6.1 6.7.85-4.9 4.65 1.25 6.65L12 17.2l-6 3.25 1.25-6.65-4.9-4.65 6.7-.85z" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon size={14} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon size={16} strokeWidth={2.5} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon size={16} strokeWidth={2.5} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon size={18} {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <rect x="3.5" y="4.5" width="3" height="3" rx="0.5" />
      <rect x="3.5" y="10.5" width="3" height="3" rx="0.5" />
      <rect x="3.5" y="16.5" width="3" height="3" rx="0.5" />
    </Icon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon size={18} {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Icon>
  );
}

/** Share: a box with an arrow leaving it upwards. */
export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </Icon>
  );
}

/** Moon (reading plan, "Tonight's book"). */
export function MoonIcon(props: IconProps) {
  return (
    <Icon size={18} {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Icon>
  );
}
