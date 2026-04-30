import { useState, useEffect } from 'react';
import { formatExactDate } from '@/lib/date';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cached, sharedCached, sharedInvalidate, subscribe, TTL } from '@/lib/cache';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Logo } from '@/components/Logo';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  GraduationCap, Users, MapPin, Search, FileText,
  Globe, ArrowRight, Shield, BookOpen, Clock, Award,
  Briefcase, CheckCircle2, DollarSign, ChevronRight, Layers, UserCircle2, RefreshCw
} from 'lucide-react';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';

interface FeaturedTutor {
  id: string;
  bio: string | null;
  education: string | null;
  experience_years: number;
  // rating fields removed
  verification_status: string;
  verification_paid: boolean;
  teaching_mode: string;
  monthly_salary_min: number | null;
  monthly_salary_max: number | null;
  is_available: boolean;
  profiles: { full_name: string; avatar_url: string | null };
  districts: { name_en: string} | null;
  tutor_subjects: { subjects: { name_en: string} }[];
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
  districts: { name_en: string};
  areas: { name_en: string} | null;
  subjects: { name_en: string} | null;
}

interface SubjectCategory {
  category_en: string;
  subjects: { id: string; name_en: string}[];
}

export default function Index() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [areas, setAreas] = useState<{ id: string; name_en: string; district_name: string }[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: string; name_en: string}[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [searchType, setSearchType] = useState<'tutors' | 'jobs'>('tutors');

  const [featuredTutors, setFeaturedTutors] = useState<FeaturedTutor[]>([]);
  const [latestJobs, setLatestJobs] = useState<LatestJob[]>([]);
  const [subjectCategories, setSubjectCategories] = useState<SubjectCategory[]>([]);
  const [refreshingTutors, setRefreshingTutors] = useState(false);
  const [refreshingJobs, setRefreshingJobs] = useState(false);

  const refreshFeaturedTutors = async () => {
    setRefreshingTutors(true);
    try {
      await sharedInvalidate('home:featured-tutors:v2');
      const { data } = await sharedCached('home:featured-tutors:v2', async () => {
        const { data } = await supabase.from('tutor_profiles')
          .select(`
            id, slug, bio, education, experience_years,
            verification_status, teaching_mode, monthly_salary_min, monthly_salary_max, is_available,
            profiles:user_id (full_name, avatar_url),
            districts (name_en),
            tutor_subjects (subjects (name_en))
          `)
          .eq('is_available', true)
          .order('is_featured', { ascending: false })
          .limit(6);
        return { data };
      }, { ttl: TTL.medium, swr: 5 * 60_000, force: true });
      if (data) setFeaturedTutors(data as unknown as FeaturedTutor[]);
    } finally {
      setRefreshingTutors(false);
    }
  };

  const refreshLatestJobs = async () => {
    setRefreshingJobs(true);
    try {
      await sharedInvalidate('home:latest-jobs:v2');
      const { data } = await sharedCached('home:latest-jobs:v2', async () => {
        const { data } = await supabase.from('jobs')
          .select('id, slug, title, description, budget_min, budget_max, teaching_mode, days_per_week, job_reference, created_at, districts (name_en), areas (name_en), subjects (name_en)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(6);
        return { data };
      }, { ttl: TTL.medium, swr: 5 * 60_000, force: true });
      if (data) setLatestJobs(data as unknown as LatestJob[]);
    } finally {
      setRefreshingJobs(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: a }, { data: s }, { data: tutors }, { data: jobs }] = await Promise.all([
        cached('lookup:areas:withDistrictName', async () => {
          const { data } = await supabase.from('areas').select('id, name_en, districts (name_en)').order('name_en');
          return { data };
        }, { ttl: TTL.long }),
        cached('lookup:subjects:withCategory', async () => {
          const { data } = await supabase.from('subjects').select('id, name_en, category_en').order('name_en');
          return { data };
        }, { ttl: TTL.long }),
        sharedCached('home:featured-tutors:v2', async () => {
          const { data } = await supabase.from('tutor_profiles')
            .select(`
              id, slug, bio, education, experience_years,
              verification_status, teaching_mode, monthly_salary_min, monthly_salary_max, is_available,
              profiles:user_id (full_name, avatar_url),
              districts (name_en),
              tutor_subjects (subjects (name_en))
            `)
            .eq('is_available', true)
            .order('is_featured', { ascending: false })
            .limit(6);
          return { data };
        }, { ttl: TTL.medium, swr: 5 * 60_000 }),
        sharedCached('home:latest-jobs:v2', async () => {
          const { data } = await supabase.from('jobs')
            .select('id, slug, title, description, budget_min, budget_max, teaching_mode, days_per_week, job_reference, created_at, districts (name_en), areas (name_en), subjects (name_en)')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(6);
          return { data };
        }, { ttl: TTL.medium, swr: 5 * 60_000 }),
      ]);

      if (a) setAreas(a.map((x: any) => ({ id: x.id, name_en: x.name_en, district_name: x.districts?.name_en || '' })));
      if (s) {
        setSubjectsList(s);
        const catMap = new Map<string, SubjectCategory>();
        for (const sub of s) {
          const catKey = (sub as any).category_en || 'General';
          if (!catMap.has(catKey)) {
            catMap.set(catKey, {
              category_en: catKey,
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

    // Live-update when SWR background refresh completes
    const unsubT = subscribe<{ data: any[] | null }>('home:featured-tutors:v2', (v) => {
      if (v?.data) setFeaturedTutors(v.data as unknown as FeaturedTutor[]);
    });
    const unsubJ = subscribe<{ data: any[] | null }>('home:latest-jobs:v2', (v) => {
      if (v?.data) setLatestJobs(v.data as unknown as LatestJob[]);
    });
    return () => { unsubT(); unsubJ(); };
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedArea) params.set('area', selectedArea);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBackground) params.set('background', selectedBackground);
    if (selectedGender) params.set('gender', selectedGender);
    navigate(`/${searchType === 'tutors' ? 'tutors' : 'jobs'}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — vibrant, mobile-first */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
        {/* Decorative orbs */}
        <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-accent/40 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full bg-tutor/40 blur-[120px] pointer-events-none" />
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur px-4 py-1.5 mb-6 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-[11px] sm:text-xs font-medium tracking-wide">
                Trusted by 4,000+ families across Bangladesh
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 animate-fade-in animation-delay-100 leading-[1.05]">
              {t('hero.title')}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto animate-fade-in animation-delay-200 leading-relaxed px-2">
              {t('hero.subtitle')}
            </p>

            {/* Search card */}
            <div className="bg-card/95 backdrop-blur-md text-foreground rounded-2xl border border-primary-foreground/20 shadow-2xl shadow-primary/30 overflow-hidden animate-fade-in animation-delay-300 text-left">
              {/* Toggle */}
              <div className="flex items-center justify-center gap-1 p-1.5 border-b border-border/50 bg-muted/40">
                <button
                  onClick={() => setSearchType('tutors')}
                  className={`flex-1 max-w-[220px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    searchType === 'tutors'
                      ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Find a Tutor
                </button>
                <button
                  onClick={() => setSearchType('jobs')}
                  className={`flex-1 max-w-[220px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    searchType === 'jobs'
                      ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md'
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
                    options={areas.map(a => ({ value: a.id, label: a.district_name ? `${a.name_en} (${a.district_name})` : a.name_en }))}
                    value={selectedArea}
                    onValueChange={setSelectedArea}
                    placeholder="📍 City"
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
                  className="w-full h-12 rounded-lg text-sm font-bold gap-2 shadow-lg bg-gradient-to-r from-primary to-accent hover:opacity-95 transition-opacity"
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

      {/* Stats — vibrant gradient tiles */}
      <section className="py-12 md:py-16 bg-background -mt-px">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
            {[
              { icon: Users, value: '1,00,000+', label: t('stats.tutors'), gradient: 'from-primary to-accent', iconBg: 'bg-primary/15', iconColor: 'text-primary' },
              { icon: Award, value: '4,000+', label: t('stats.matches'), gradient: 'from-tutor to-accent', iconBg: 'bg-tutor/15', iconColor: 'text-tutor' },
              { icon: MapPin, value: '64', label: t('stats.cities'), gradient: 'from-accent to-primary', iconBg: 'bg-accent/15', iconColor: 'text-accent' },
              { icon: CheckCircle2, value: '98%', label: t('stats.satisfaction'), gradient: 'from-success to-accent', iconBg: 'bg-success/15', iconColor: 'text-success' },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative bg-card rounded-2xl border border-border/60 p-4 md:p-6 text-center group transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                <div className={`w-10 h-10 md:w-11 md:h-11 mx-auto mb-3 rounded-xl ${stat.iconBg} ${stat.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-xl md:text-3xl font-bold tracking-tight text-foreground mb-1 tabular-nums">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-wider font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject Categories — colorful gradient tiles */}
      {subjectCategories.length > 0 && (
        <section className="relative py-14 md:py-20 bg-gradient-to-br from-muted/40 via-background to-accent/[0.06] overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-tutor/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-end justify-between mb-8 md:mb-12 max-w-5xl flex-wrap gap-3">
              <div>
                <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary font-bold bg-primary/10 px-3 py-1 rounded-full mb-3">Categories</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Browse by Subject</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Explore 50+ subjects across every academic category — pick a category to discover qualified tutors and active tuition jobs in your area.
                </p>
              </div>
              <Link to="/jobs">
                <Button variant="ghost" className="hidden sm:flex gap-1 text-sm text-primary hover:text-primary/80 font-semibold">
                  All Jobs <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectCategories.slice(0, 6).map((cat, i) => {
                const palettes = [
                  { grad: 'from-primary to-accent', icon: 'bg-primary/15 text-primary', border: 'hover:border-primary/40' },
                  { grad: 'from-tutor to-accent', icon: 'bg-tutor/15 text-tutor', border: 'hover:border-tutor/40' },
                  { grad: 'from-accent to-primary', icon: 'bg-accent/15 text-accent', border: 'hover:border-accent/40' },
                  { grad: 'from-success to-accent', icon: 'bg-success/15 text-success', border: 'hover:border-success/40' },
                  { grad: 'from-agency to-warning', icon: 'bg-agency/15 text-agency', border: 'hover:border-agency/40' },
                  { grad: 'from-warning to-agency', icon: 'bg-warning/15 text-warning', border: 'hover:border-warning/40' },
                ];
                const p = palettes[i % palettes.length];
                return (
                  <div
                    key={i}
                    className={`group relative bg-card rounded-2xl border border-border/60 p-5 transition-all ${p.border} hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 animate-fade-in overflow-hidden`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.grad}`} />
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-xl ${p.icon} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-sm tracking-tight flex-1">{cat.category_en}</h3>
                      <span className={`text-[11px] font-bold tabular-nums ${p.icon} px-2 py-0.5 rounded-md`}>{cat.subjects.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subjects.slice(0, 5).map((sub) => (
                        <Link key={sub.id} to={`/jobs?subject=${sub.id}`}>
                          <Badge variant="outline" className="cursor-pointer border-border/60 hover:bg-foreground hover:text-background hover:border-foreground transition-colors text-[11px] font-normal">
                            {sub.name_en}
                          </Badge>
                        </Link>
                      ))}
                      {cat.subjects.length > 5 && (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground border-border/60 font-normal">+{cat.subjects.length - 5}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Latest Tuition Jobs */}
      {latestJobs.length > 0 && (
        <section className="py-14 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-8 md:mb-12 flex-wrap gap-3">
              <div>
                <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] text-success font-bold bg-success/10 px-3 py-1 rounded-full mb-3">Opportunities</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Latest Tuition Jobs</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Fresh tuition opportunities posted daily by parents and guardians across Bangladesh — apply directly to start teaching on your own terms.
                </p>
              </div>
              <Link to="/jobs">
                <Button variant="ghost" className="hidden sm:flex gap-1 text-sm text-primary hover:text-primary/80 font-semibold">
                  All Jobs <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestJobs.map((job, i) => (
                <Link key={job.id} to={`/jobs/${(job as any).slug || job.id}`} className="group block animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <article className="relative bg-card rounded-2xl border border-border/60 p-6 h-full transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.18)] hover:-translate-y-0.5 overflow-hidden">
                    {/* Subtle top accent on hover */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Header: reference + status */}
                    <div className="flex items-center justify-between mb-3">
                      {job.job_reference ? (
                        <span className="text-[10px] font-mono text-muted-foreground tracking-wider px-2 py-0.5 rounded-md bg-muted/60 border border-border/40">
                          {job.job_reference}
                        </span>
                      ) : <span />}
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-success font-semibold">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                        </span>
                        Open
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-[15px] tracking-tight leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.6rem]">
                      {job.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-5 line-clamp-2 leading-relaxed min-h-[2rem]">{job.description}</p>

                    {/* Meta chips */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {job.areas?.name_en
                          ? `${job.areas.name_en}, ${job.districts?.name_en || ''}`
                          : job.districts?.name_en}
                      </span>
                      {job.subjects && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          {job.subjects.name_en}
                        </span>
                      )}
                      {job.days_per_week && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {job.days_per_week}d/wk
                        </span>
                      )}
                    </div>

                    {/* Footer: price + date */}
                    <div className="flex items-end justify-between pt-4 border-t border-border/50">
                      {(job.budget_min || job.budget_max) ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget</span>
                          <span className="text-base font-bold tracking-tight text-foreground tabular-nums leading-tight">
                            ৳{job.budget_min || 0}–{job.budget_max || 0}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">/mo</span>
                          </span>
                        </div>
                      ) : <span />}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatExactDate(new Date(job.created_at))}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link to="/jobs"><Button variant="outline">View All Jobs <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
            </div>
          </div>
        </section>
      )}

      {/* Top Rated Tutors */}
      {featuredTutors.length > 0 && (
        <section className="relative py-14 md:py-20 bg-gradient-to-br from-tutor/[0.06] via-background to-accent/[0.08] overflow-hidden">
          <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-accent/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-tutor/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-end justify-between mb-8 md:mb-12 flex-wrap gap-3">
              <div>
                <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] text-tutor font-bold bg-tutor/10 px-3 py-1 rounded-full mb-3">Educators</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">Top Rated Tutors</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Hand-picked, identity-verified educators trusted by thousands of families. Hire with complete confidence.
                </p>
              </div>
              <Link to="/tutors">
                <Button variant="ghost" className="hidden sm:flex gap-1 text-sm text-tutor hover:text-tutor/80 font-semibold">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredTutors.map((tutor, i) => {
                const tutorSubjects = tutor.tutor_subjects?.map(ts =>
                  ts.subjects?.name_en
                ).filter(Boolean).slice(0, 3) || [];
                const isVerified = tutor.verification_status === 'approved' && tutor.verification_paid;

                return (
                  <Link key={tutor.id} to={`/tutor/${(tutor as any).slug || tutor.id}`} className="group block animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <article className="relative bg-card rounded-2xl border border-border/60 p-6 h-full transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.18)] hover:-translate-y-0.5 overflow-hidden">
                      {/* Top hover accent */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Header: avatar + name + rating */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14 border-2 border-border/60 ring-2 ring-background">
                            <AvatarImage src={tutor.profiles?.avatar_url || ''} />
                            <AvatarFallback className="text-base font-semibold bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                              {tutor.profiles?.full_name?.charAt(0) || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          {isVerified && (
                            <span className="absolute -bottom-0.5 -right-0.5 bg-success rounded-full p-0.5 ring-2 ring-card">
                              <CheckCircle2 className="h-3 w-3 text-background" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[15px] tracking-tight truncate group-hover:text-primary transition-colors leading-tight">
                            {tutor.profiles?.full_name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{tutor.education || 'Educator'}</p>
                        </div>
                      </div>

                      {/* Meta chips */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {tutor.districts && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {tutor.districts.name_en}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          {tutor.experience_years}y exp
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-foreground/80 bg-muted/50 px-2 py-1 rounded-md">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {tutor.teaching_mode === 'in_person' ? 'In-Person' : tutor.teaching_mode === 'online' ? 'Online' : 'Hybrid'}
                        </span>
                      </div>

                      {/* Subjects */}
                      {tutorSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {tutorSubjects.map((s, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Footer: salary */}
                      {(tutor.monthly_salary_min || tutor.monthly_salary_max) ? (
                        <div className="flex items-end justify-between pt-4 border-t border-border/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Expected</span>
                            <span className="text-base font-bold tracking-tight text-foreground tabular-nums leading-tight">
                              ৳{tutor.monthly_salary_min || '—'}–{tutor.monthly_salary_max || '—'}
                              <span className="text-[10px] font-normal text-muted-foreground ml-1">/mo</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            View profile <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-border/50 flex justify-end">
                          <span className="text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            View profile <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      )}
                    </article>
                  </Link>
                );
              })}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link to="/tutors"><Button variant="outline">View All Tutors <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works — vibrant gradient cards */}
      <section className="py-14 md:py-20 bg-gradient-to-br from-background via-primary/[0.03] to-accent/[0.05]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
            <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] text-accent font-bold bg-accent/10 px-3 py-1 rounded-full mb-3">Process</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">{t('howItWorks.title')}</h2>
            <p className="text-sm text-muted-foreground">
              From posting your requirement to starting your first lesson — three simple steps. No middlemen, no hidden fees.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc'), step: '01', grad: 'from-primary to-accent', iconBg: 'bg-primary/15 text-primary' },
              { icon: Users, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc'), step: '02', grad: 'from-tutor to-accent', iconBg: 'bg-tutor/15 text-tutor' },
              { icon: BookOpen, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc'), step: '03', grad: 'from-success to-accent', iconBg: 'bg-success/15 text-success' },
            ].map((step, i) => (
              <div
                key={i}
                className="group relative bg-card rounded-2xl border border-border/60 p-6 md:p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${step.grad}`} />
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${step.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-2xl font-black tracking-tight bg-gradient-to-br ${step.grad} bg-clip-text text-transparent opacity-60`}>
                    {step.step}
                  </span>
                </div>
                <h3 className="font-bold text-base tracking-tight text-foreground mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — vibrant gradient cards */}
      <section className="relative py-14 md:py-24 bg-gradient-to-b from-muted/30 via-background to-muted/20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10 md:mb-16 max-w-2xl mx-auto">
            <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary font-bold bg-primary/10 px-3 py-1 rounded-full mb-3">Why Us</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Why Choose Manage Tutor?</h2>
            <p className="text-sm text-muted-foreground">
              Built for trust, designed for results — rigorous tutor vetting, transparent pricing, and a smooth booking experience.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto">
            {[
              { icon: Shield, title: 'Verified Tutors', desc: 'ID, education, and background checks before approval.', grad: 'from-primary to-accent', iconBg: 'bg-primary/15 text-primary' },
              { icon: Clock, title: 'Flexible Scheduling', desc: 'Mornings, evenings, weekends, online or in-person.', grad: 'from-success to-accent', iconBg: 'bg-success/15 text-success' },
              { icon: Award, title: 'Trusted Platform', desc: 'Secure payments, vetted profiles, dedicated support.', grad: 'from-warning to-agency', iconBg: 'bg-warning/15 text-warning' },
              { icon: Users, title: 'Trusted Community', desc: '4,000+ matched families and 1,00,000+ tutors.', grad: 'from-tutor to-accent', iconBg: 'bg-tutor/15 text-tutor' },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-card rounded-2xl border border-border/60 p-4 md:p-6 transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.grad}`} />
                <div className={`w-11 h-11 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm tracking-tight text-foreground mb-1.5">{feature.title}</h4>
                <p className="text-muted-foreground text-xs leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — vibrant gradient */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary via-secondary to-tutor text-primary-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-accent/30 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-[500px] h-[400px] bg-tutor/40 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative z-10 max-w-2xl">
          <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] text-primary-foreground/80 font-bold bg-primary-foreground/10 backdrop-blur px-3 py-1 rounded-full mb-4 border border-primary-foreground/20">Get Started</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">Ready to Get Started?</h2>
          <p className="text-sm sm:text-base text-primary-foreground/80 mb-8 md:mb-10 max-w-lg mx-auto leading-relaxed px-2">
            Whether you're a parent searching for the perfect tutor or an educator ready to grow your career — Manage Tutor connects you in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?mode=signup&role=parent">
              <Button size="lg" className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90 h-12 px-7 rounded-xl text-sm font-bold gap-2 shadow-2xl shadow-black/20">
                I Need a Tutor <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth?mode=signup&role=tutor">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/40 bg-primary-foreground/10 backdrop-blur text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground h-12 px-7 rounded-xl text-sm font-bold gap-2">
                I'm a Tutor <GraduationCap className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
