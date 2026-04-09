import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  GraduationCap, Users, MapPin, Star, Search, FileText, 
  MessageSquare, Globe, CheckCircle2, ArrowRight, Shield,
  BookOpen, Clock, Award
} from 'lucide-react';

export default function Index() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();

  const subjects = ['Physics', 'Mathematics', 'English', 'Chemistry', 'Biology', 'IELTS', 'Bangla', 'ICT'];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Manage Tutor</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/tutors" className="text-muted-foreground hover:text-primary transition-colors font-medium">{t('nav.findTutors')}</Link>
            <Link to="/jobs" className="text-muted-foreground hover:text-primary transition-colors font-medium">{t('nav.browseJobs')}</Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors font-medium">{t('nav.about')}</Link>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            {user ? (
              <Link to="/dashboard">
                <Button>{t('nav.dashboard')}</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="font-medium">{t('nav.login')}</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button className="font-medium">{t('nav.signup')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero text-primary-foreground py-24 md:py-36">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 animate-fade-in">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Trusted by 4,000+ families across Bangladesh</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 animate-fade-in animation-delay-100 leading-tight">
              {t('hero.title')}
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto animate-fade-in animation-delay-200 leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-300">
              <Link to="/tutors">
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg px-8 h-14 rounded-xl shadow-lg shadow-secondary/30">
                  <Search className="mr-2 h-5 w-5" />
                  {t('hero.cta.findTutor')}
                </Button>
              </Link>
              <Link to="/auth?mode=signup&role=tutor">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-xl bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  {t('hero.cta.becomeTutor')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L60 74.7C120 69 240 59 360 53.3C480 48 600 48 720 53.3C840 59 960 69 1080 69.3C1200 69 1320 59 1380 53.3L1440 48V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background relative -mt-1">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, value: '1,00,000+', label: t('stats.tutors'), color: 'text-primary' },
              { icon: Award, value: '4,000+', label: t('stats.matches'), color: 'text-secondary' },
              { icon: MapPin, value: '64', label: t('stats.cities'), color: 'text-tutor' },
              { icon: Star, value: '98%', label: t('stats.satisfaction'), color: 'text-accent' },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="bg-card rounded-2xl p-6 shadow-lg shadow-foreground/5 text-center hover-lift animate-fade-in card-shine"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <stat.icon className={`h-8 w-8 mx-auto mb-3 ${stat.color}`} />
                <div className="text-3xl md:text-4xl font-extrabold text-foreground mb-1">{stat.value}</div>
                <div className="text-muted-foreground text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Subjects */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            {subjects.map((subject, i) => (
              <span 
                key={subject}
                className="px-5 py-2.5 bg-muted rounded-full text-sm font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 gradient-soft">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{t('howItWorks.title')}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Simple steps to find your perfect tutor</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc'), step: '01', color: 'bg-primary' },
              { icon: Users, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc'), step: '02', color: 'bg-secondary' },
              { icon: BookOpen, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc'), step: '03', color: 'bg-accent' },
            ].map((step, i) => (
              <div key={i} className="relative animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="bg-card rounded-3xl p-8 shadow-xl shadow-foreground/5 hover-lift h-full border border-border/50">
                  <div className="text-6xl font-extrabold text-muted/50 mb-4">{step.step}</div>
                  <div className={`${step.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-5`}>
                    <step.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-border h-8 w-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Why Choose Manage Tutor?</h2>
              <div className="space-y-5">
                {[
                  { icon: Shield, title: 'Verified Tutors', desc: 'All tutors go through our verification process' },
                  { icon: Clock, title: 'Flexible Scheduling', desc: 'Find tutors available when you need them' },
                  { icon: Award, title: 'Trusted Platform', desc: 'Secure platform connecting parents with qualified tutors' },
                  { icon: Star, title: 'Reviews & Ratings', desc: 'Read genuine reviews from other parents' },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4 items-start animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">{feature.title}</h4>
                      <p className="text-muted-foreground text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-3xl p-10 relative">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Active Tutors', value: '1L+' },
                  { label: 'Districts', value: '64' },
                  { label: 'Subjects', value: '50+' },
                  { label: 'Happy Parents', value: '4K+' },
                ].map((stat, i) => (
                  <div key={i} className="bg-card rounded-2xl p-5 text-center shadow-lg">
                    <div className="text-2xl font-extrabold text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-lg mx-auto">Join thousands of families who found their perfect tutor through Manage Tutor</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground h-14 px-8 rounded-xl text-lg">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Manage Tutor</span>
            </div>
            <p className="text-background/60">{t('footer.tagline')}</p>
            <div className="flex gap-6 text-sm text-background/60">
              <Link to="/about" className="hover:text-background transition-colors">About</Link>
              <Link to="/contact" className="hover:text-background transition-colors">Contact</Link>
              <Link to="/privacy" className="hover:text-background transition-colors">Privacy</Link>
            </div>
          </div>
          <div className="border-t border-background/10 mt-8 pt-8 text-center text-background/40 text-sm">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}
