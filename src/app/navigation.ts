import type { ComponentType } from 'react';
import { FriendsIcon, HomeIcon, ShelvesIcon, YearIcon, type IconProps } from '@/shared/ui/icons';
import { PATHS } from './paths';

export interface NavItem {
  id: 'home' | 'shelves' | 'friends' | 'year';
  to: string;
  Icon: ComponentType<IconProps>;
  /** Match the path exactly (only Home, so it isn't active on every route). */
  end?: boolean;
}

/** Main destinations, shared by the mobile tab bar and the desktop side menu. */
export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', to: PATHS.home, Icon: HomeIcon, end: true },
  { id: 'shelves', to: PATHS.shelves, Icon: ShelvesIcon },
  { id: 'friends', to: PATHS.friends, Icon: FriendsIcon },
  { id: 'year', to: PATHS.year, Icon: YearIcon },
];
