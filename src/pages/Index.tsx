import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { formatDistanceToNow } from 'date-fns';
import {
  GraduationCap, Users, MapPin, Star, Search, FileText,
  Globe, ArrowRight, Shield, BookOpen, Clock, Award,
  Briefcase, CheckCircle2, DollarSign, ChevronRight, Layers, UserCircle2
} from 'lucide-react';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';

interface FeaturedTutor {
  id: string;
  bio: string | null;
  education: string | null;
  experience_years: number;
  average_rating: number;
  total_reviews: number;
  verification_status: string;
  verification_paid: boolean;
  teaching_mode: string;
  monthly_salary_min: number | null;
  monthly_salary_max: number | null;
  is_available: boolean;
  profiles: { full_name: string; avatar_url: string | null };
  districts: { name_en: string; name_bn: string } | null;
  tutor_subjects: { subjects: { name_en: string; name_bn: string } }[];
}

interface LatestJob {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  teaching_mode: string;
  days_per_week: number | null;
  job_reference: string | null;
  created_at: string;
  districts: { name_en: string; name_bn: string };
  subjects: { name_en: string; name_bn: string } | null;
}

interface SubjectCategory {
  category_en: string;
  category_bn: string | null;
  subjects: { id: string; name_en: string; name_bn: string }[];
}

export default function Index() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [districts, setDistricts] = useState<{ id: string; name_en: string; name_bn: string }[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name_en: string; name_bn: string }[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [searchType, setSearchType] = useState<'tutors' | 'jobs'>('tutors');

  const [featuredTutors, setFeaturedTutors] = useState<FeaturedTutor[]>([]);
  const [latestJobs, setLatestJobs] = useState<LatestJob[]>([]);
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: d }, { data: s }, { data: tutors }, { data: jobs }] = await Promise.all([
        supabase.from('districts').select('id, name_en, name_bn').order('name_en'),
        supabase.from('subjects').select('id, name_en, name_bn, category_en, category_bn').order('name_en'),
        supabase.from('tutor_profiles')
          .select(`
            id, bio, education, experience_years, average_rating, total_reviews,
            verification_status, teaching_mode, monthly_salary_min, monthly_salary_max, is_available,
            profiles:user_id (full_name, avatar_url),
            districts (name_en, name_bn),
            tutor_subjects (subjects (name_en, name_bn))
          `)
          .eq('is_available', true)
          .order('average_rating', { ascending: false })
          .limit(6),
        supabase.from('jobs')
          .select('id, title, description, budget_min, budget_max, teaching_mode, days_per_week, job_reference, created_at, districts (name_en, name_bn), subjects (name_en, name_bn)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      if (d) setDistricts(d);
      if (s) {
        setSubjectsList(s);
        const catMap = new Map<string, SubjectCategory>();
        for (const sub of s) {
          const catKey = (sub as any).category_en || 'General';
          if (!catMap.has(catKey)) {
            catMap.set(catKey, {
              category_en: catKey,
              category_bn: (sub as any).category_bn || catKey,
              subjects: [],
            });
          }
          catMap.get(catKey)!.subjects.push(sub);
        }
        setSubjectCategories(Array.from(catMap.values()));
      }
      if (tutors) setFeaturedTutors(tutors as unknown as FeaturedTutor[]);
      if (jobs) setLatestJobs(jobs as unknown as LatestJob[]);
    };
    fetchAll();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedDistrict) params.set('district', selectedDistrict);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBackground) params.set('background', selectedBackground);
    if (selectedGender) params.set('gender', selectedGender);
    navigate(`/${searchType === 'tutors' ? 'tutors' : 'jobs'}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section — minimal & premium */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.04] via-background to-background">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Single soft glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 pt-20 md:pt-28 pb-16 md:pb-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-4 py-1.5 mb-7 animate-fade-in">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                Trusted by 4,000+ families across Bangladesh
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-5 animate-fade-in animation-delay-100 leading-[1.05]">
              {t('hero.title')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto animate-fade-in animation-delay-200 leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Premium minimal search card */}
            <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/70 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.18)] overflow-hidden animate-fade-in animation-delay-300 text-left">
              {/* Toggle */}
              <div className="flex items-center justify-center gap-1 p-1.5 border-b border-border/50 bg-muted/30">
                <button
                  onClick={() => setSearchType('tutors')}
                  className={`flex-1 max-w-[200px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    searchType === 'tutors'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Find a Tutor
                </button>
                <button
                  onClick={() => setSearchType('jobs')}
                  className={`flex-1 max-w-[200px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    searchType === 'jobs'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Find Jobs
                </button>
              </div>

              {/* Filter row */}
              <div className="p-4 md:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
                  <SearchableSelect
                    options={districts.map(d => ({ value: d.id, label: d.name_en }))}
                    value={selectedDistrict}
                    onValueChange={setSelectedDistrict}
                    placeholder="📍 Location"
                    className="h-11 rounded-lg border-border/60 bg-background"
                  />
                  <SearchableSelect
                    options={STUDENT_BACKGROUNDS.map(b => ({ value: b, label: b }))}
                    value={selectedBackground}
                    onValueChange={setSelectedBackground}
                    placeholder="🎓 Background"
                    className="h-11 rounded-lg border-border/60 bg-background"
                  />
                  <SearchableSelect
                    options={JOB_CATEGORIES.map(c => ({ value: c, label: c }))}
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                    placeholder="📚 Category"
                    className="h-11 rounded-lg border-border/60 bg-background"
                  />
                  <SearchableSelect
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'any', label: 'Any' },
                    ]}
                    value={selectedGender}
                    onValueChange={setSelectedGender}
                    placeholder="👤 Gender"
                    className="h-11 rounded-lg border-border/60 bg-background"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  className="w-full h-11 rounded-lg text-sm font-semibold gap-2 shadow-sm"
                >
                  <Search className="h-4 w-4" />
                  {searchType === 'tutors' ? 'Search Tutors' : 'Search Jobs'}
                  <ArrowRight className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — minimal premium */}
      <section className="py-20 bg-background border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/40">
            {[
              { icon: Users, value: '1,00,000+', label: t('stats.tutors') },
              { icon: Award, value: '4,000+', label: t('stats.matches') },
              { icon: MapPin, value: '64', label: t('stats.cities') },
              { icon: Star, value: '98%', label: t('stats.satisfaction') },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-background px-6 py-10 text-center group transition-colors hover:bg-muted/30 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <stat.icon className="h-5 w-5 mx-auto mb-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                <div className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-1.5">{stat.value}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject Categories */}
      {subjectCategories.length > 0 && (
        <section className="py-16 gradient-soft">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Browse by Subject</h2>
                <p className="text-muted-foreground">Find tuition jobs across 50+ subjects in every category</p>
              </div>
              <Link to="/jobs">
                <Button variant="outline" className="hidden sm:flex gap-1">
                  All Jobs <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjectCategories.slice(0, 6).map((cat, i) => (
                <Card key={i} className="hover-lift border-border/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg">{cat.category_en}</h3>
                      <Badge variant="secondary" className="ml-auto">{cat.subjects.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subjects.slice(0, 5).map((sub) => (
                        <Link key={sub.id} to={`/jobs?subject=${sub.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs">
                            {sub.name_en}
                          </Badge>
                        </Link>
                      ))}
                      {cat.subjects.length > 5 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">+{cat.subjects.length - 5} more</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Tuition Jobs */}
      {latestJobs.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Latest Tuition Jobs</h2>
                <p className="text-muted-foreground">New opportunities posted by parents and guardians</p>
              </div>
              <Link to="/jobs">
                <Button variant="outline" className="hidden sm:flex gap-1">
                  All Jobs <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestJobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`}>
                  <Card className="hover-lift border-border/50 overflow-hidden h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base truncate mb-1">{job.title}</h3>
                          {job.job_reference && (
                            <Badge variant="outline" className="text-xs font-mono mb-2">{job.job_reference}</Badge>
                          )}
                        </div>
                        <Badge className="bg-success/10 text-success border-success/20 flex-shrink-0 ml-2">Open</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.districts?.name_en}
                        </span>
                        {job.subjects && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {job.subjects.name_en}
                          </span>
                        )}
                        {job.days_per_week && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {job.days_per_week}d/wk
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {(job.budget_min || job.budget_max) && (
                          <span className="text-sm font-semibold text-primary">
                            ৳{job.budget_min || 0} – ৳{job.budget_max || 0}/mo
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link to="/jobs"><Button variant="outline">View All Jobs <ChevronRight className="h-4 w-4 ml-1" /></Button></Link>
            </div>
          </div>
        </section>
      )}

      {/* Tutor Profiles */}
      {featuredTutors.length > 0 && (
        <section className="py-16 gradient-soft">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Top Rated Tutors</h2>
                <p className="text-muted-foreground">Verified and trusted tutors ready to teach</p>
              </div>
              <Link to="/tutors">
                <Button variant="outline" className="hidden sm:flex gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredTutors.map((tutor) => {
                const tutorSubjects = tutor.tutor_subjects?.map(ts =>
                  ts.subjects?.name_en
                ).filter(Boolean).slice(0, 3) || [];

                return (
                  <Link key={tutor.id} to={`/tutor/${tutor.id}`}>
                    <Card className="hover-lift border-border/50 overflow-hidden h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                            <AvatarImage src={tutor.profiles?.avatar_url || ''} />
                            <AvatarFallback className="text-lg font-bold">{tutor.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-base truncate">{tutor.profiles?.full_name}</h3>
                              {tutor.verification_status === 'approved' && tutor.verification_paid && (
                                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{tutor.education || 'Educator'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                              <span className="text-sm font-semibold">{tutor.average_rating || 0}</span>
                              <span className="text-xs text-muted-foreground">({tutor.total_reviews} reviews)</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                          {tutor.districts && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {tutor.districts.name_en}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {tutor.experience_years} yrs
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {tutor.teaching_mode === 'in_person' ? 'In-Person' : tutor.teaching_mode === 'online' ? 'Online' : 'Hybrid'}
                          </span>
                        </div>
                        {tutorSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {tutorSubjects.map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {(tutor.monthly_salary_min || tutor.monthly_salary_max) && (
                          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                            <DollarSign className="h-3.5 w-3.5" />
                            ৳{tutor.monthly_salary_min || '—'} – ৳{tutor.monthly_salary_max || '—'}/mo
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link to="/tutors"><Button variant="outline">View All Tutors <ChevronRight className="h-4 w-4 ml-1" /></Button></Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-24 bg-background">
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
                {i < 2 && <ArrowRight className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-border h-8 w-8" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 gradient-soft">
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
            <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-3xl p-10">
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

      {/* CTA */}
      <section className="py-20 gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-lg mx-auto">Join thousands of families who found their perfect tutor through Manage Tutor</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=signup&role=parent">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground h-14 px-8 rounded-xl text-lg">
                I Need a Tutor <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth?mode=signup&role=tutor">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-14 px-8 rounded-xl text-lg">
                I'm a Tutor <GraduationCap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
