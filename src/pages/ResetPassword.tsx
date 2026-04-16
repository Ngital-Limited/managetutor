import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Check for recovery event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash params
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setDone(true);
      toast({ title: 'Success', description: 'Password updated successfully' });
      setTimeout(() => navigate('/auth'), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-3 mb-10">
          <Logo size="md" />
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Password Updated!</h2>
            <p className="text-muted-foreground">Redirecting to login...</p>
          </div>
        ) : !isRecovery ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">This password reset link is invalid or has expired. Please request a new one.</p>
            <Button onClick={() => navigate('/auth')} variant="outline">Back to Login</Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
              <p className="text-muted-foreground mt-1">Enter your new password below</p>
            </div>

            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">New Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 rounded-lg"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">Confirm Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pl-10 rounded-lg"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 rounded-lg text-sm font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
