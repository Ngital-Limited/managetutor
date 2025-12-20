import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCap, LogOut, User, Briefcase, MessageSquare, Star, Globe } from 'lucide-react';

export default function Dashboard() {
  const { user, role, loading, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Manage Tutor</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
              <Globe className="h-4 w-4 mr-1" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.user_metadata?.full_name || user?.email}!</h1>
        <p className="text-muted-foreground mb-8">
          Role: <span className="capitalize font-medium text-primary">{t(`role.${role}`) || 'User'}</span>
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {role === 'parent' && (
            <>
              <Card className="hover-lift">
                <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />My Jobs</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">View and manage your tuition job posts</p></CardContent>
              </Card>
              <Card className="hover-lift">
                <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Find Tutors</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Browse verified tutors in your area</p></CardContent>
              </Card>
            </>
          )}
          {role === 'tutor' && (
            <>
              <Card className="hover-lift">
                <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-tutor" />Browse Jobs</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Find tuition opportunities</p></CardContent>
              </Card>
              <Card className="hover-lift">
                <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-tutor" />My Profile</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Update your tutor profile</p></CardContent>
              </Card>
            </>
          )}
          <Card className="hover-lift">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-accent" />Messages</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">View your conversations</p></CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
