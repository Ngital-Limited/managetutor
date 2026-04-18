import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Routes that REQUIRE authentication. Everything else is public
// (homepage, find-tutors, browse-jobs, job/tutor details, about, etc.)
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/tutor-dashboard',
  '/parent-dashboard',
  '/admin',
  '/tutor/profile',
  '/tutor/applied',
  '/tutor/find-jobs',
  '/tutor/recommendations',
  '/tutor/boost',
  '/tutor/verify-badge',
  '/tutor/cv',
  '/parent/profile',
  '/messages',
  '/favorites',
  '/notifications',
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Redirect unauthenticated users to /auth ONLY when they try to open a
 * protected route. Public pages (homepage, listings, details) stay open.
 */
export function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (!isProtected(location.pathname)) return;

    const redirectTo = location.pathname + location.search;
    navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);

  return null;
}
