import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, Menu, X } from 'lucide-react';

export function Header() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/tutors', label: t('nav.findTutors') },
    { to: '/jobs', label: t('nav.browseJobs') },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size="md" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-muted-foreground hover:text-primary transition-colors font-medium">{link.label}</Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'বাংলা' : 'EN'}
          </Button>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link to="/dashboard"><Button>{t('nav.dashboard')}</Button></Link>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" className="font-medium">{t('nav.login')}</Button></Link>
                <Link to="/auth?mode=signup"><Button className="font-medium">{t('nav.signup')}</Button></Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className="block py-2 text-muted-foreground hover:text-primary transition-colors font-medium">
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {user ? (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}><Button className="w-full">{t('nav.dashboard')}</Button></Link>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileOpen(false)}><Button variant="ghost" className="w-full font-medium">{t('nav.login')}</Button></Link>
                <Link to="/auth?mode=signup" onClick={() => setMobileOpen(false)}><Button className="w-full font-medium">{t('nav.signup')}</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}