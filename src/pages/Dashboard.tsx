import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user, effectiveRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (effectiveRole === 'tutor') {
        navigate('/tutor/dashboard');
      } else if (effectiveRole === 'parent') {
        navigate('/parent/dashboard');
      } else if (effectiveRole === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, loading, effectiveRole, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
