import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { useIsStandalone } from '@/hooks/use-standalone';

export function Footer() {
  const { t } = useLanguage();
  const isStandalone = useIsStandalone();

  const exploreLinks = [
    { to: '/tutors', label: 'Find Tutors' },
    { to: '/jobs', label: 'Browse Jobs' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
    { to: '/pricing', label: 'Pricing' },
    ...(isStandalone ? [] : [{ to: '/install', label: 'Install App' }]),
  ];

  const legalLinks = [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms & Conditions' },
  ];

  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-secondary-foreground/10 w-full overflow-x-hidden">
      <div className="page-container">
        {/* Main */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" variant="light" />
            <p className="mt-3 text-sm text-secondary-foreground/60 leading-relaxed max-w-xs">
              Bangladesh's most trusted tutor marketplace.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/50 mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/50 mb-4">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/50 mb-4">
              Contact
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:care@managetutor.com"
                  className="inline-flex items-center gap-2 text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  care@managetutor.com
                </a>
              </li>
              <li>
                <a
                  href="tel:09647874034"
                  className="inline-flex items-center gap-2 text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  09647-874034
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/8801737874034"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  01737-874034
                </a>
              </li>
              <li className="text-secondary-foreground/55 text-xs pt-1">
                Katasur, Mohammadpur, Dhaka-1207
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary-foreground/10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary-foreground/50">
          <p>{t('footer.copyright')}</p>
          <p>
            Designed &amp; Developed by{' '}
            <a
              href="https://ngital.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-secondary-foreground/75 hover:text-primary transition-colors"
            >
              Ngital
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
