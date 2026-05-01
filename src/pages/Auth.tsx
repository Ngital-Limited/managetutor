import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Users, Loader2, Mail, Lock, User, ArrowRight, Phone, ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { PhoneInput, isValidBDPhone } from '@/components/PhoneInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

const REFERRAL_SOURCES = [
  'Facebook',
  'Google Search',
  'Friend / Family',
  'YouTube',
  'Newspaper / Ad',
  'Other',
];

type AppRole = 'parent' | 'tutor';

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
  const [phone, setPhone] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>(
    (searchParams.get('role') as AppRole) || 'parent'
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { role: userRole } = useAuth();

  useEffect(() => {
    if (user && !authLoading && userRole) {
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        navigate(redirect);
        return;
      }
      if (userRole === 'tutor') {
        navigate('/tutor/dashboard');
      } else if (userRole === 'parent') {
        navigate('/parent/dashboard');
      } else if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, userRole, navigate, searchParams]);

  // Poll for email verification when showing the verify screen
  useEffect(() => {
    if (!showVerifyEmail || emailVerified) return;
    const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
    const MAX_CONSECUTIVE_ERRORS = 5;
    const startTime = Date.now();
    let errorCount = 0;

    const interval = setInterval(async () => {
      // Check session expiry
      if (Date.now() - startTime > EXPIRY_MS) {
        setVerifyError('Verification session timed out. Please resend the verification email or try signing up again.');
        clearInterval(interval);
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session?.user?.email_confirmed_at) {
          setEmailVerified(true);
          setVerifyError(null);
          clearInterval(interval);
        } else {
          errorCount = 0; // reset on successful poll
        }
      } catch (err: any) {
        errorCount++;
        if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
          setVerifyError('Unable to check verification status. Please check your connection and try again.');
          clearInterval(interval);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [showVerifyEmail, emailVerified]);

  // Also listen for auth state changes (user clicks verification link in same browser)
  useEffect(() => {
    if (!showVerifyEmail || emailVerified) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email_confirmed_at) {
        setEmailVerified(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [showVerifyEmail, emailVerified]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendLoading || resendCooldown > 0 || !signupEmail) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: signupEmail });
    if (error) {
      toast({ title: 'Failed to resend', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Verification email sent', description: `Check your inbox at ${signupEmail}` });
      setResendCooldown(60);
    }
    setResendLoading(false);
  };

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
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setSignupEmail(email);
          setShowVerifyEmail(true);
          setLoading(false);
          return;
        }
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      } else {
        // Check ban status after successful sign-in
        const { data: { user: signedInUser } } = await supabase.auth.getUser();
        if (signedInUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_banned, banned_reason, banned_at')
            .eq('id', signedInUser.id)
            .maybeSingle();

          if (profileData?.is_banned) {
            await supabase.auth.signOut();
            const reason = profileData.banned_reason?.trim() || 'No reason provided';
            const when = profileData.banned_at
              ? new Date(profileData.banned_at).toLocaleDateString()
              : '';
            toast({
              title: 'Account Banned',
              description: `Your account has been banned${when ? ` on ${when}` : ''}. Reason: ${reason}. Please contact support if you believe this is a mistake.`,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }
      }
    } else {
      if (!fullName.trim()) {
        toast({ title: 'Validation Error', description: 'Full name is required', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (!phone) {
        toast({ title: 'Validation Error', description: 'Phone number is required', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (!isValidBDPhone(phone)) {
        toast({ title: 'Validation Error', description: 'Please enter a valid Bangladesh phone number (+880 1XXX-XXXXXX)', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, selectedRole, phone, referralSource || undefined);
      if (error) {
        toast({ title: 'Sign Up Failed', description: error.message, variant: 'destructive' });
      } else {
        setSignupEmail(email);
        setShowVerifyEmail(true);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter your email', variant: 'destructive' });
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setResetSent(true);
      toast({ title: 'Email Sent', description: 'Check your inbox for the password reset link' });
    }
    setResetLoading(false);
  };


  const roles = [
    { id: 'parent' as AppRole, icon: Users, label: t('auth.parent'), desc: 'Find tutors for your child' },
    { id: 'tutor' as AppRole, icon: GraduationCap, label: t('auth.tutor'), desc: 'Teach students & earn' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 text-primary-foreground max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Logo size="lg" variant="light" />
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            {isLogin ? 'Welcome back!' : 'Join our community'}
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Connect with verified tutors for personalized education. Trusted by thousands of families across Bangladesh.
          </p>
          <div className="mt-12 space-y-4">
            {[
              '100,000+ verified tutors',
              'All 64 districts covered',
              'Safe & secure platform',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-primary-foreground/90">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-10">
            <Logo size="md" />
          </Link>

          {showVerifyEmail ? (
            /* ─── Email Verification View ─── */
            <div className="text-center">
              {emailVerified ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your email <strong className="text-foreground">{signupEmail}</strong> has been confirmed.
                  </p>
                  <Button
                    className="w-full h-11 rounded-lg text-sm font-semibold"
                    onClick={() => { setShowVerifyEmail(false); setEmailVerified(false); setIsLogin(true); setEmail(signupEmail); setPassword(''); }}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" /> Go to Login
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h2>
                  <p className="text-muted-foreground mb-6">
                    We've sent a verification link to<br />
                    <strong className="text-foreground">{signupEmail}</strong>
                  </p>
                  <div className="p-4 rounded-lg bg-accent/50 border border-accent text-sm space-y-2">
                    <p>Please check your inbox and click the verification link to activate your account.</p>
                    <p className="text-muted-foreground">Don't forget to check your spam/junk folder.</p>
                  </div>
                  {verifyError ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm space-y-3 mt-4">
                      <div className="flex items-center gap-2 text-destructive font-medium">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{verifyError}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setVerifyError(null);
                          // Re-trigger polling by toggling showVerifyEmail
                          setShowVerifyEmail(false);
                          setTimeout(() => setShowVerifyEmail(true), 50);
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-2" /> Retry Verification Check
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Waiting for verification...</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-4 h-10 rounded-lg text-sm"
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendCooldown > 0}
                  >
                    {resendLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      <><Mail className="h-4 w-4 mr-2" /> Resend Verification Email</>
                    )}
                  </Button>
                  <button
                    onClick={() => { setShowVerifyEmail(false); setEmailVerified(false); setIsLogin(true); setEmail(''); setPassword(''); }}
                    className="flex items-center justify-center gap-1.5 mt-4 text-sm text-primary hover:underline font-semibold mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Login
                  </button>
                </>
              )}
            </div>
          ) : showForgotPassword ? (
            /* ─── Forgot Password View ─── */
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Reset Password</h2>
                <p className="text-muted-foreground mt-1">
                  {resetSent ? 'Check your email for the reset link' : 'Enter your email to receive a password reset link'}
                </p>
              </div>

              {!resetSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <Label htmlFor="resetEmail" className="text-sm font-medium text-muted-foreground">Email</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="h-11 pl-10 rounded-lg border-border"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-lg text-sm font-semibold" disabled={resetLoading}>
                    {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              ) : (
                <div className="p-4 rounded-lg bg-accent/50 border border-accent text-sm text-center">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p>We've sent a password reset link to <strong>{resetEmail}</strong></p>
                  <p className="text-muted-foreground mt-1">Check your inbox and spam folder</p>
                </div>
              )}

              <button
                onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); }}
                className="flex items-center justify-center gap-1.5 mt-6 text-sm text-primary hover:underline font-semibold mx-auto"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </button>
            </div>
          ) : (
            /* ─── Login / Signup View ─── */
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">
                  {isLogin ? 'Sign in' : 'Create account'}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {isLogin ? 'Enter your credentials to continue' : 'Get started in just a few steps'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Role selector (signup only) */}
                {!isLogin && (
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-2.5 block text-muted-foreground">{t('auth.selectRole')}</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(role.id)}
                            className={`group relative p-3 rounded-xl border-2 transition-all text-center ${
                              selectedRole === role.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30 bg-card'
                            }`}
                          >
                            <role.icon className={`h-5 w-5 mx-auto mb-1.5 transition-colors ${
                              selectedRole === role.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                            }`} />
                            <div className={`text-xs font-semibold transition-colors ${
                              selectedRole === role.id ? 'text-primary' : 'text-foreground'
                            }`}>{role.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{role.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium text-muted-foreground">{t('auth.fullName')} <span className="text-destructive">*</span></Label>
                      <div className="relative mt-1.5">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-11 pl-10 rounded-lg border-border"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">Phone Number <span className="text-destructive">*</span></Label>
                      <div className="mt-1.5">
                        <PhoneInput value={phone} onChange={setPhone} />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="referralSource" className="text-sm font-medium text-muted-foreground">How did you hear about us?</Label>
                      <Select value={referralSource} onValueChange={setReferralSource}>
                        <SelectTrigger id="referralSource" className="h-11 mt-1.5 rounded-lg border-border">
                          <SelectValue placeholder="Select a source (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {REFERRAL_SOURCES.map((src) => (
                            <SelectItem key={src} value={src}>{src}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">{t('auth.email')}</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 rounded-lg border-border"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">{t('auth.password')}</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 rounded-lg border-border"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 rounded-lg text-sm font-semibold" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  {isLogin ? t('auth.login') : t('auth.signup')}
                </Button>

                {/* Divider */}
                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-lg text-sm font-medium gap-2.5"
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                {t('auth.noAccount')}{' '}
                <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-semibold">
                  {t('auth.signup')}
                </button>
              </>
            ) : (
              <>
                {t('auth.hasAccount')}{' '}
                <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-semibold">
                  {t('auth.login')}
                </button>
              </>
            )}
          </p>

          <Link to="/" className="flex items-center justify-center gap-1.5 mt-5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
