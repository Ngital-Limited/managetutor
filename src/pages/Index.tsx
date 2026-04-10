import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/SearchableSelect';
import { 
  GraduationCap, Users, MapPin, Star, Search, FileText, 
  Globe, ArrowRight, Shield,
  BookOpen, Clock, Award
} from 'lucide-react';

export default function Index() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [districts, setDistricts] = useState<{ id: string; name_en: string; name_bn: string }[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name_en: string; name_bn: string }[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [searchType, setSearchType] = useState<'tutors' | 'jobs'>('tutors');

  useEffect(() => {
    const fetchFilters = async () => {
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from('districts').select('id, name_en, name_bn').order('name_en'),
        supabase.from('subjects').select('id, name_en, name_bn').order('name_en'),
      ]);
      if (d) setDistricts(d);
      if (s) setSubjectsList(s);
    };
    fetchFilters();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedDistrict) params.set('district', selectedDistrict);
    if (selectedSubject) params.set('subject', selectedSubject);
    if (selectedMode) params.set('mode', selectedMode);
    navigate(`/${searchType === 'tutors' ? 'tutors' : 'jobs'}?${params.toString()}`);
  };

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

      {/* Hero Section with Integrated Search */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero text-primary-foreground pt-16 pb-36 md:pt-24 md:pb-48">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          
          {/* Floating decorative elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-secondary/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute top-40 right-16 w-32 h-32 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-40 left-1/4 w-16 h-16 bg-primary-foreground/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-5 py-2.5 mb-8 animate-fade-in border border-primary-foreground/10">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold tracking-wide">Trusted by 4,000+ families across Bangladesh</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 animate-fade-in animation-delay-100 leading-tight max-w-4xl mx-auto">
              {t('hero.title')}
            </h1>
            <p className="text-base md:text-lg opacity-80 mb-6 max-w-xl mx-auto animate-fade-in animation-delay-200 leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 100L60 93.3C120 86.7 240 73.3 360 66.7C480 60 600 60 720 66.7C840 73.3 960 86.7 1080 86.7C1200 86.7 1320 73.3 1380 66.7L1440 60V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Search Card — overlapping hero */}
      <section className="relative z-20 -mt-28 md:-mt-36 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-card rounded-2xl shadow-2xl shadow-primary/15 border border-border overflow-hidden animate-fade-in animation-delay-300">
            {/* Tab Header */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setSearchType('tutors')}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-bold transition-all duration-200 ${
                  searchType === 'tutors'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Users className="h-4 w-4" />
                Find a Tutor
              </button>
              <button
                onClick={() => setSearchType('jobs')}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-sm font-bold transition-all duration-200 ${
                  searchType === 'jobs'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="h-4 w-4" />
                Find Tuition Jobs
              </button>
            </div>

            {/* Filter Body */}
            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Location
                  </label>
                  <SearchableSelect
                    options={districts.map(d => ({ value: d.id, label: language === 'bn' ? d.name_bn : d.name_en }))}
                    value={selectedDistrict}
                    onValueChange={setSelectedDistrict}
                    placeholder="All Districts"
                    className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Subject
                  </label>
                  <SearchableSelect
                    options={subjectsList.map(s => ({ value: s.id, label: language === 'bn' ? s.name_bn : s.name_en }))}
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                    placeholder="All Subjects"
                    className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Mode
                  </label>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-border/60 focus:bg-card">
                      <SelectValue placeholder="Any Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in_person">In-Person</SelectItem>
                      <SelectItem value="hybrid">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full h-12 rounded-xl text-base font-bold gap-2 shadow-lg shadow-primary/20">
                <Search className="h-5 w-5" />
                {searchType === 'tutors' ? 'Search Tutors' : 'Search Tuition Jobs'}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
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
