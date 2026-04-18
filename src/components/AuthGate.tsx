import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Public routes that do NOT require authentication.
const PUBLIC_PREFIXES = [
  '/auth',
  '/reset-password',
  '/install',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/payment',
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Force unauthenticated users to /auth. After login they are sent to the
 * page they originally tried to open (or /dashboard for "/").
 */
export function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (isPublic(location.pathname)) return;

    const redirectTo =
      location.pathname === '/' ? '/dashboard' : location.pathname + location.search;
    navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);

  return null;
}
