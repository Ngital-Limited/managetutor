import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Logo size="md" variant="light" />
            </div>
            <p className="text-background/60 text-sm">{t('footer.tagline')}</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-background/80 mb-3">Contact Us</h3>
            <p className="flex items-start gap-2 text-background/60">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              Katasur, Mohammadpur, Dhaka-1207, Bangladesh
            </p>
            <a href="mailto:care@managetutor.com" className="flex items-center gap-2 text-background/60 hover:text-background transition-colors">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              care@managetutor.com
            </a>
            <a href="tel:09647874034" className="flex items-center gap-2 text-background/60 hover:text-background transition-colors">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Hotline: 09647-874034
            </a>
            <a href="https://wa.me/8801737874034" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-background/60 hover:text-background transition-colors">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp: 01737-874034
            </a>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-background/80 mb-3">Quick Links</h3>
            <div className="flex flex-col gap-2 text-background/60">
              <Link to="/about" className="hover:text-background transition-colors">About Us</Link>
              <Link to="/tutors" className="hover:text-background transition-colors">Find Tutors</Link>
              <Link to="/jobs" className="hover:text-background transition-colors">Browse Jobs</Link>
              <Link to="/contact" className="hover:text-background transition-colors">Contact</Link>
              <Link to="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-background transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>

        {/* SEO Content */}
        <div className="border-t border-background/10 mt-8 pt-8 space-y-4 text-background/50 text-sm leading-relaxed max-w-4xl mx-auto">
          <h2 className="text-background/70 font-semibold text-base">Find Trusted Home Tutors in Bangladesh with Manage Tutor</h2>
          <p>
            Manage Tutor is Bangladesh's most reliable platform for connecting students and parents with verified home tutors. Whether you're looking for a home tutor in Dhaka, Chattogram, Khulna, Rajshahi, or any other city, we make it easy to hire a trusted tutor with confidence. With over 1,00,000 verified male and female tutors, we specialize in one-on-one private tutoring across subjects like Physics, Math, English, IELTS preparation, and more.
          </p>
          <p>
            Parents can safely find trusted home tuition services with our verified tutor system, designed to ensure quality and security. Choose a female home tutor or lady tutor in Dhaka if you prefer — we support flexible options tailored to your family's needs.
          </p>
          <p>
            From home tuition benefits to subject-wise expert guidance, Manage Tutor supports all types of learners with personalized education at home. Our tutor registration system allows passionate educators to join our platform and earn from home tuition easily, whether they offer online, hybrid, or in-person teaching.
          </p>
          <p>
            We've already facilitated 4,000+ successful tuition matches by focusing on safe tutor hiring, academic performance, and student satisfaction. Whether you're preparing for exams, boosting grades, or targeting an international score with a private IELTS tutor, Manage Tutor is your go-to choice for the best home tuition platform in Bangladesh.
          </p>
        </div>

        <div className="border-t border-background/10 mt-8 pt-8 text-center text-background/40 text-sm">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
