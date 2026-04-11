import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Globe } from 'lucide-react';

export function Header() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size="md" />
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/tutors" className="text-muted-foreground hover:text-primary transition-colors font-medium">{t('nav.findTutors')}</Link>
          <Link to="/jobs" className="text-muted-foreground hover:text-primary transition-colors font-medium">{t('nav.browseJobs')}</Link>
          <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors font-medium">About</Link>
          <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors font-medium">Contact</Link>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'বাংলা' : 'EN'}
          </Button>
          {user ? (
            <Link to="/dashboard"><Button>{t('nav.dashboard')}</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" className="font-medium">{t('nav.login')}</Button></Link>
              <Link to="/auth?mode=signup"><Button className="font-medium">{t('nav.signup')}</Button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
