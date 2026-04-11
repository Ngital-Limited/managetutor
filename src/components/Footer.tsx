import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Mail, Phone, MessageCircle, ArrowUpRight, Heart } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  const quickLinks = [
    { to: '/tutors', label: 'Find Tutors' },
    { to: '/jobs', label: 'Browse Jobs' },
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact' },
    { to: '/pricing', label: 'Pricing' },
  ];

  const legalLinks = [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms & Conditions' },
  ];

  const contactItems = [
    {
      icon: MapPin,
      text: 'Katasur, Mohammadpur, Dhaka-1207',
      href: undefined,
    },
    {
      icon: Mail,
      text: 'care@managetutor.com',
      href: 'mailto:care@managetutor.com',
    },
    {
      icon: Phone,
      text: '09647-874034',
      href: 'tel:09647874034',
    },
    {
      icon: MessageCircle,
      text: '01737-874034 (WhatsApp)',
      href: 'https://wa.me/8801737874034',
      external: true,
    },
  ];

  return (
    <footer className="relative bg-secondary text-secondary-foreground overflow-hidden">
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

      {/* Main footer content */}
      <div className="container mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <Logo size="md" variant="light" />
            </div>
            <p className="text-secondary-foreground/60 text-sm leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
            {/* Stats mini badges */}
            <div className="flex gap-3 mt-5">
              <div className="bg-secondary-foreground/10 rounded-lg px-3 py-2 text-center">
                <div className="text-sm font-bold text-secondary-foreground/90">1L+</div>
                <div className="text-[10px] text-secondary-foreground/50 uppercase tracking-wide">Tutors</div>
              </div>
              <div className="bg-secondary-foreground/10 rounded-lg px-3 py-2 text-center">
                <div className="text-sm font-bold text-secondary-foreground/90">4K+</div>
                <div className="text-[10px] text-secondary-foreground/50 uppercase tracking-wide">Matches</div>
              </div>
              <div className="bg-secondary-foreground/10 rounded-lg px-3 py-2 text-center">
                <div className="text-sm font-bold text-secondary-foreground/90">64</div>
                <div className="text-[10px] text-secondary-foreground/50 uppercase tracking-wide">Cities</div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/50 mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group flex items-center gap-1.5 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/50 mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group flex items-center gap-1.5 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground/50 mb-4">Contact Us</h3>
            <ul className="space-y-3">
              {contactItems.map((item, i) => {
                const content = (
                  <span className="flex items-start gap-2.5 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors">
                    <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" />
                    {item.text}
                  </span>
                );
                return (
                  <li key={i}>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* SEO Content - collapsible feel */}
        <div className="border-t border-secondary-foreground/10 mt-12 pt-8">
          <div className="max-w-4xl mx-auto space-y-3 text-secondary-foreground/40 text-xs leading-relaxed">
            <h2 className="text-secondary-foreground/55 font-semibold text-sm">
              Find Trusted Home Tutors in Bangladesh with Manage Tutor
            </h2>
            <p>
              Manage Tutor is Bangladesh's most reliable platform for connecting students and parents with verified home tutors. Whether you're looking for a home tutor in Dhaka, Chattogram, Khulna, Rajshahi, or any other city, we make it easy to hire a trusted tutor with confidence. With over 1,00,000 verified male and female tutors, we specialize in one-on-one private tutoring across subjects like Physics, Math, English, IELTS preparation, and more.
            </p>
            <p>
              Parents can safely find trusted home tuition services with our verified tutor system. Choose a female home tutor or lady tutor in Dhaka if you prefer — we support flexible options tailored to your family's needs. From home tuition benefits to subject-wise expert guidance, Manage Tutor supports all types of learners with personalized education at home.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary-foreground/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-secondary-foreground/40 text-xs">
            {t('footer.copyright')}
          </p>
          <p className="text-secondary-foreground/30 text-xs flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-destructive/70 fill-destructive/70" /> in Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
