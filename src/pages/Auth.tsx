import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Users, Building2, Loader2 } from 'lucide-react';
import { z } from 'zod';

type AppRole = 'parent' | 'tutor' | 'agency';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, signIn, user, loading: authLoading } = useAuth();
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
    { id: 'parent' as AppRole, icon: Users, label: t('auth.parent'), color: 'border-parent text-parent' },
    { id: 'tutor' as AppRole, icon: GraduationCap, label: t('auth.tutor'), color: 'border-tutor text-tutor' },
    { id: 'agency' as AppRole, icon: Building2, label: t('auth.agency'), color: 'border-agency text-agency' },
  ];

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Manage Tutor</span>
          </Link>
          <CardTitle>{isLogin ? t('auth.login') : t('auth.signup')}</CardTitle>
          <CardDescription>
            {isLogin ? 'Welcome back!' : 'Create your account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label>{t('auth.selectRole')}</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          selectedRole === role.id
                            ? `${role.color} bg-muted`
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <role.icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{role.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? t('auth.login') : t('auth.signup')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            {isLogin ? (
              <p>
                {t('auth.noAccount')}{' '}
                <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-medium">
                  {t('auth.signup')}
                </button>
              </p>
            ) : (
              <p>
                {t('auth.hasAccount')}{' '}
                <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">
                  {t('auth.login')}
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
