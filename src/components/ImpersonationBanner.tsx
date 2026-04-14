import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ImpersonationBanner() {
  const { impersonation, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!impersonation) return null;

  const handleStop = async () => {
    await stopImpersonation();
    navigate('/admin');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-3 shadow-lg">
      <ShieldAlert className="h-4 w-4" />
      <span className="text-sm font-medium">
        Impersonating: <strong>{impersonation.profile.full_name}</strong> ({impersonation.role}) — All actions use their real permissions
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        onClick={handleStop}
      >
        <LogOut className="h-3 w-3 mr-1" />
        Stop Impersonation
      </Button>
    </div>
  );
}
