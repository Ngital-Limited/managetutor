import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Mail, Phone, MessageCircle, ArrowUpRight, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    { icon: MapPin, text: 'Katasur, Mohammadpur, Dhaka-1207', href: undefined },
    { icon: Mail, text: 'care@managetutor.com', href: 'mailto:care@managetutor.com' },
    { icon: Phone, text: '09647-874034', href: 'tel:09647874034' },
    { icon: MessageCircle, text: '01737-874034 (WhatsApp)', href: 'https://wa.me/8801737874034', external: true },
  ];

  return (
    <footer className="relative bg-secondary text-secondary-foreground overflow-hidden border-t border-secondary-foreground/10">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--secondary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--secondary-foreground)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Soft glow accent */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* CTA / Newsletter strip */}
        <div className="pt-16 pb-12 border-b border-secondary-foreground/10">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-primary/80 font-medium">Stay in the loop</span>
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2 mb-2">
                Get the best tuition opportunities in your inbox
              </h3>
              <p className="text-sm text-secondary-foreground/60 leading-relaxed">
                New jobs, top tutors, and platform updates — delivered weekly. No spam.
              </p>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2 w-full md:max-w-md md:ml-auto"
            >
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-11 bg-secondary-foreground/5 border-secondary-foreground/15 text-secondary-foreground placeholder:text-secondary-foreground/40 rounded-lg focus-visible:ring-primary/40"
              />
              <Button type="submit" className="h-11 rounded-lg gap-1.5 shadow-sm">
                Subscribe <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>

        {/* Main columns */}
        <div className="py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Logo size="md" variant="light" />
            <p className="text-secondary-foreground/55 text-sm leading-relaxed max-w-xs mt-4">
              {t('footer.tagline')}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-6 max-w-xs">
              {[
                { v: '1L+', l: 'Tutors' },
                { v: '4K+', l: 'Matches' },
                { v: '64', l: 'Cities' },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-lg border border-secondary-foreground/10 bg-secondary-foreground/[0.03] px-3 py-2.5 text-center"
                >
                  <div className="text-base font-semibold tracking-tight tabular-nums">{s.v}</div>
                  <div className="text-[10px] text-secondary-foreground/45 uppercase tracking-wider mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground/45 mb-5">
              Explore
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group inline-flex items-center gap-1 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground/45 mb-5">
              Legal
            </h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group inline-flex items-center gap-1 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground/45 mb-5">
              Contact
            </h3>
            <ul className="space-y-3.5">
              {contactItems.map((item, i) => {
                const content = (
                  <span className="flex items-start gap-3 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-secondary-foreground/10 bg-secondary-foreground/[0.03]">
                      <item.icon className="h-3.5 w-3.5 text-primary/80" />
                    </span>
                    <span className="leading-snug">{item.text}</span>
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

        {/* SEO copy */}
        <div className="border-t border-secondary-foreground/10 py-10">
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
        <div className="border-t border-secondary-foreground/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-secondary-foreground/45 text-xs">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-secondary-foreground/40">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              All systems operational
            </span>
            <span className="hidden sm:inline text-secondary-foreground/20">•</span>
            <span className="hidden sm:inline">Made in Bangladesh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
