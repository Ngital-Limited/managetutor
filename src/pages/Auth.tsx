import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Users, Building2, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

type AppRole = 'parent' | 'tutor' | 'agency';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>(
    (searchParams.get('role') as AppRole) || 'parent'
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: err.errors[0].message, variant: 'destructive' });
        setLoading(false);
        return;
      }
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      } else {
        navigate('/dashboard');
      }
    } else {
      if (!fullName.trim()) {
        toast({ title: 'Validation Error', description: 'Full name is required', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, selectedRole);
      if (error) {
        toast({ title: 'Sign Up Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success!', description: 'Account created successfully.' });
        navigate('/dashboard');
      }
    }
    setLoading(false);
  };

  const roles = [
    { id: 'parent' as AppRole, icon: Users, label: t('auth.parent'), desc: 'Find tutors for your child', color: 'border-parent bg-parent/5 text-parent' },
    { id: 'tutor' as AppRole, icon: GraduationCap, label: t('auth.tutor'), desc: 'Teach students & earn', color: 'border-tutor bg-tutor/5 text-tutor' },
    { id: 'agency' as AppRole, icon: Building2, label: t('auth.agency'), desc: 'Manage multiple tutors', color: 'border-agency bg-agency/5 text-agency' },
  ];

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-6 group">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl text-foreground">Manage Tutor</span>
          </Link>
          <CardTitle className="text-2xl">{isLogin ? t('auth.login') : t('auth.signup')}</CardTitle>
          <CardDescription className="text-base">
            {isLogin ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div>
                  <Label className="text-sm font-semibold mb-3 block">{t('auth.selectRole')}</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${
                          selectedRole === role.id
                            ? `${role.color} border-current`
                            : 'border-border hover:border-muted-foreground bg-muted/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedRole === role.id ? 'bg-current/10' : 'bg-muted'}`}>
                          <role.icon className={`h-5 w-5 ${selectedRole === role.id ? '' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="font-semibold">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="fullName" className="font-semibold">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 h-12 rounded-xl"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email" className="font-semibold">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12 rounded-xl"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-semibold">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-12 rounded-xl"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLogin ? t('auth.login') : t('auth.signup')}
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium gap-3"
              disabled={googleLoading || loading}
              onClick={async () => {
                setGoogleLoading(true);
                const { error } = await signInWithGoogle();
                if (error) {
                  toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
                }
                setGoogleLoading(false);
              }}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Sign in with Google
            </Button>
          </form>

          <div className="mt-8 text-center">
            {isLogin ? (
              <p className="text-muted-foreground">
                {t('auth.noAccount')}{' '}
                <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-semibold">
                  {t('auth.signup')}
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {t('auth.hasAccount')}{' '}
                <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-semibold">
                  {t('auth.login')}
                </button>
              </p>
            )}
          </div>

          <Link to="/" className="flex items-center justify-center gap-2 mt-6 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
