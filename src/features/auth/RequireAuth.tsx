import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/shared/ui/PageLoader';
import { useAuth } from './AuthContext';
import { createLoginRedirectState, LOGIN_PATH } from './authRedirect';
import { AuthUnavailable } from './components/AuthUnavailable';

/** Route guard: renders the child routes only for a signed-in user, otherwise sends them to the login screen. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  switch (status) {
    case 'loading':
      return <PageLoader />;
    case 'unavailable':
      return <AuthUnavailable />;
    case 'signedOut':
      return (
        <Navigate to={LOGIN_PATH} replace state={createLoginRedirectState(location.pathname, location.search)} />
      );
    case 'signedIn':
      return <Outlet />;
  }
}
