import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '../components/ui-app/LoadingSpinner';
import { useAuth } from '../lib/auth';
import { screensForRole, toUiRole } from '../lib/auth/roleMap';

export function RequireAuth() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const { status, isAuthenticated } = useAuth();

  if (status === 'idle' || status === 'loading') {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

/** Blocks screens that are not allowed for the authenticated user's role. */
export function RoleScreenGuard({ screen }: { screen: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const allowed = screensForRole(toUiRole(user.role));
  if (!allowed.has(screen)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}
