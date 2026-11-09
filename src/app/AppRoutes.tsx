import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/features/auth';
import { AppShell } from './layout/AppShell';
import { AuthLayout } from './layout/AuthLayout';
import { NotFoundPage } from './NotFoundPage';
import { PATHS } from './paths';

/*
 * Route-level code splitting: each screen is its own chunk. Pages are imported
 * from their own module (not the feature index), so they don't end up in the
 * main chunk through components the shell already imports.
 */
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })));
const SearchPage = lazy(() => import('@/features/search/SearchPage').then((m) => ({ default: m.SearchPage })));
const BookPage = lazy(() => import('@/features/books/BookPage').then((m) => ({ default: m.BookPage })));
const ShelvesPage = lazy(() => import('@/features/shelves/ShelvesPage').then((m) => ({ default: m.ShelvesPage })));
const FriendsPage = lazy(() => import('@/features/friends/FriendsPage').then((m) => ({ default: m.FriendsPage })));
const YearPage = lazy(() => import('@/features/year/YearPage').then((m) => ({ default: m.YearPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={PATHS.login} element={<LoginPage />} />
      </Route>

      {/* Everything else is private. */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path={PATHS.home} element={<HomePage />} />
          <Route path={PATHS.search} element={<SearchPage />} />
          <Route path={PATHS.book} element={<BookPage />} />
          <Route path={PATHS.shelves} element={<ShelvesPage />} />
          <Route path={PATHS.friends} element={<FriendsPage />} />
          <Route path={PATHS.year} element={<YearPage />} />
          <Route path={PATHS.settings} element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
