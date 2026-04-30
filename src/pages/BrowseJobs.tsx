import { useState, useEffect, useMemo } from 'react';
import { formatExactDate } from '@/lib/date';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cached, TTL } from '@/lib/cache';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, MapPin, Briefcase, 
  Users, ArrowRight, ChevronLeft, ChevronRight, Send, Loader2,
  Clock, Filter, X, Sparkles, Tag, GraduationCap, AlertTriangle
} from 'lucide-react';
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';
import { Progress } from '@/components/ui/progress';
import { getMinProfileCompleteness } from '@/lib/profileCompleteness';

interface District {
  id: string;
  name_en: string;
  division_en: string;
}

interface Area {
  id: string;
  name_en: string;
  district_id: string;
  district_name?: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  class_level: string;
  days_per_week: number;
  duration_hours: number;
  budget_min: number;
  budget_max: number;
  teaching_mode: string;
  preferred_tutor_gender: string;
  status: string;
  total_applications: number;
  created_at: string;
  number_of_students: number;
  student_age: string | null;
  start_date: string | null;
  location_details: string | null;
  job_reference: string | null;
  is_featured: boolean;
  districts: { name_en: string} | null;
  areas: { name_en: string} | null;
  subjects: { name_en: string} | null;
  job_subjects?: { subjects: { name_en: string} }[];
}

const JOBS_PER_PAGE = 10;

export default function BrowseJobs({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(searchParams.get('district') || 'all');
  const [selectedArea, setSelectedArea] = useState<string>(searchParams.get('area') || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedBackground, setSelectedBackground] = useState<string>(searchParams.get('background') || 'all');
  const [selectedTime, setSelectedTime] = useState<string>('all');

  const TIME_OPTIONS = [
    'Flexible / Anytime',
    'Morning (6 AM – 9 AM)',
    'Late Morning (9 AM – 12 PM)',
    'Afternoon (12 PM – 4 PM)',
    'After Evening (Anytime)',
    'Evening (4 PM – 7 PM)',
    'Night (7 PM – 10 PM)',
    'Weekends Only',
  ];

  // Application modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  
  const [applying, setApplying] = useState(false);
  const [tutorProfileId, setTutorProfileId] = useState<string | null>(null);
  const [tutorProfileCompleteness, setTutorProfileCompleteness] = useState(0);
  const [minCompleteness, setMinCompleteness] = useState(70);
  const [tutorClassLevels, setTutorClassLevels] = useState<string[]>([]);
  const [tutorSubjectIds, setTutorSubjectIds] = useState<string[]>([]);
  const [tutorPrefilterApplied, setTutorPrefilterApplied] = useState(false);

  const sortedAreas = useMemo(() => {
    const filtered = selectedDistrict && selectedDistrict !== 'all'
      ? areas.filter(a => a.district_id === selectedDistrict)
      : areas;
    return [...filtered].sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [areas, selectedDistrict]);

  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [districts]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDistrict !== 'all') count++;
    if (selectedArea !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedBackground !== 'all') count++;
    if (selectedTime !== 'all') count++;
    if (embedded && tutorPrefilterApplied && (tutorClassLevels.length > 0 || tutorSubjectIds.length > 0)) count++;
    return count;
  }, [selectedDistrict, selectedArea, selectedCategory, selectedBackground, selectedTime, embedded, tutorPrefilterApplied, tutorClassLevels, tutorSubjectIds]);

  useEffect(() => {
    fetchData();
    getMinProfileCompleteness().then(setMinCompleteness);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [selectedDistrict, selectedArea, selectedCategory, selectedBackground, selectedTime, currentPage, tutorClassLevels, tutorSubjectIds, tutorPrefilterApplied]);

  useEffect(() => {
    if (user && role === 'tutor') {
      fetchTutorProfile();
    }
  }, [user, role]);

  const fetchTutorProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tutor_profiles')
      .select('id, bio, education, experience_years, monthly_salary_min, verification_status, gender, district_id, area_id, teaching_mode, class_levels')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setTutorProfileId(data.id);
      let complete = 0;
      
      if (data.education) complete += 10;
      if (data.experience_years && data.experience_years > 0) complete += 10;
      if (data.monthly_salary_min && data.monthly_salary_min > 0) complete += 10;
      if (data.gender) complete += 10;
      if (data.district_id) complete += 10;
      if (data.teaching_mode) complete += 10;
      if (data.class_levels && data.class_levels.length > 0) complete += 10;
      if (data.verification_status === 'approved') complete += 10;
      const subjectsRes = await supabase
        .from('tutor_subjects')
        .select('subject_id', { count: 'exact' })
        .eq('tutor_profile_id', data.id);
      if (subjectsRes.count && subjectsRes.count > 0) complete += 10;
      setTutorProfileCompleteness(complete);

      // Pre-filter for embedded tutor dashboard view (initial load only; tutor can clear)
      if (embedded && !tutorPrefilterApplied) {
        if (data.district_id && selectedDistrict === 'all') {
          setSelectedDistrict(data.district_id);
        }
        if (data.area_id && selectedArea === 'all') {
          setSelectedArea(data.area_id);
        }
        setTutorClassLevels(data.class_levels || []);
        setTutorSubjectIds((subjectsRes.data || []).map((s: any) => s.subject_id));
        setTutorPrefilterApplied(true);
      }
    }
  };

  const fetchData = async () => {
    const [areasRes, districtsRes] = await Promise.all([
      cached('lookup:areas:withDistrict', async () => {
        const { data } = await supabase.from('areas').select('id, name_en, district_id, districts (name_en)').order('name_en');
        return { data };
      }, { ttl: TTL.long }),
      cached('lookup:districts:withDivision', async () => {
        const { data } = await supabase.from('districts').select('id, name_en, division_en').order('name_en');
        return { data };
      }, { ttl: TTL.long }),
    ]);

    if (areasRes.data) {
      setAreas(areasRes.data.map((a: any) => ({
        id: a.id,
        name_en: a.name_en,
        district_id: a.district_id,
        district_name: a.districts?.name_en || '',
      })));
    }
    if (districtsRes.data) setDistricts(districtsRes.data);

    await fetchJobs();
  };

  const fetchJobs = async () => {
    setLoading(true);

    let countQuery = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (selectedDistrict && selectedDistrict !== 'all') {
      countQuery = countQuery.eq('district_id', selectedDistrict);
    }
    if (selectedArea && selectedArea !== 'all') {
      countQuery = countQuery.eq('area_id', selectedArea);
    }
    if (selectedTime && selectedTime !== 'all') {
      countQuery = countQuery.eq('preferred_time', selectedTime);
    }

    const from = (currentPage - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    let query = supabase
      .from('jobs')
      .select(`
        *,
        districts (name_en),
        areas (name_en),
        subjects (id, name_en),
        job_subjects (subjects (id, name_en))
      `)
      .eq('status', 'open')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (selectedDistrict && selectedDistrict !== 'all') {
      query = query.eq('district_id', selectedDistrict);
    }
    if (selectedArea && selectedArea !== 'all') {
      query = query.eq('area_id', selectedArea);
    }
    if (selectedTime && selectedTime !== 'all') {
      query = query.eq('preferred_time', selectedTime);
    }

    // Tutor pre-filter (embedded dashboard view): match class_levels and subjects
    const tutorFilterActive = embedded && tutorPrefilterApplied && (tutorClassLevels.length > 0 || tutorSubjectIds.length > 0);

    // Category & Background filters apply client-side (matched against title, description, class_level, special_requirements)
    const needsClientFilter = (selectedCategory && selectedCategory !== 'all') || (selectedBackground && selectedBackground !== 'all') || !!searchQuery || tutorFilterActive;

    if (!needsClientFilter) {
      const { count } = await countQuery;
      setTotalCount(count || 0);
      const { data } = await query.range(from, to);
      setJobs((data as unknown as Job[]) || []);
      setLoading(false);
      return;
    }

    // Fetch full set then filter+paginate locally
    const { data } = await query.limit(500);
    let filtered = (data as unknown as Job[]) || [];

    const matchesText = (j: Job, kw: string) => {
      const k = kw.toLowerCase();
      return (
        j.title?.toLowerCase().includes(k) ||
        j.description?.toLowerCase().includes(k) ||
        j.class_level?.toLowerCase().includes(k) ||
        (j as any).special_requirements?.toLowerCase().includes(k)
      );
    };

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(j => matchesText(j, selectedCategory));
    }
    if (selectedBackground && selectedBackground !== 'all') {
      filtered = filtered.filter(j => matchesText(j, selectedBackground));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)
      );
    }

    if (tutorFilterActive) {
      filtered = filtered.filter(j => {
        const levelMatch = tutorClassLevels.length === 0
          || (j.class_level && tutorClassLevels.includes(j.class_level));
        const jobSubjectIds = [
          ...(j.job_subjects?.map((js: any) => js.subjects?.id).filter(Boolean) || []),
          (j as any).subject_id,
        ].filter(Boolean) as string[];
        const subjectMatch = tutorSubjectIds.length === 0
          || jobSubjectIds.length === 0
          || jobSubjectIds.some(id => tutorSubjectIds.includes(id));
        return levelMatch && subjectMatch;
      });
    }

    setTotalCount(filtered.length);
    setJobs(filtered.slice(from, to + 1));
    setLoading(false);
  };

  const handleApply = (job: Job) => {
    if (!user) {
      const redirect = window.location.pathname + window.location.search;
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (role !== 'tutor') {
      toast({
        title: "Tutor Account Required",
        description: "You need to register as a tutor to apply for jobs.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    if (!tutorProfileId) {
      toast({
        title: "Complete Your Profile",
        description: "Please complete your tutor profile before applying.",
        variant: "destructive"
      });
      navigate('/tutor/profile');
      return;
    }
    if (tutorProfileCompleteness < minCompleteness) {
      toast({
        title: "Profile Incomplete",
        description: `Your profile is ${tutorProfileCompleteness}% complete. You need at least ${minCompleteness}% to apply.`,
        variant: "destructive"
      });
      navigate('/tutor/profile');
      return;
    }
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const submitApplication = async () => {
    if (!selectedJob || !tutorProfileId) {
      toast({ title: "Error", description: "Unable to submit application.", variant: "destructive" });
      return;
    }

    setApplying(true);
    
    const { error } = await supabase.from('applications').insert({
      job_id: selectedJob.id,
      tutor_id: tutorProfileId,
      status: 'pending'
    });

    setApplying(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: "Already Applied", description: "You have already applied for this job", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to submit application.", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Application Submitted!", description: "Your application has been sent. Good luck!" });
    setShowApplyModal(false);
    fetchJobs();
  };

  const getTeachingModeIcon = (mode: string) => {
    switch (mode) {
      case 'online': return '🌐';
      case 'in_person': return '🏠';
      case 'hybrid': return '🔄';
      default: return '📚';
    }
  };

  const getTeachingModeLabel = (mode: string) => {
    switch (mode) {
      case 'online': return 'Online';
      case 'in_person': return 'In-Person';
      case 'hybrid': return 'Hybrid';
      default: return mode;
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Male Tutor';
      case 'female': return 'Female Tutor';
      default: return 'Any Gender';
    }
  };

  const totalPages = Math.ceil(totalCount / JOBS_PER_PAGE);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchJobs();
  };

  const clearFilters = () => {
    setSelectedDistrict('all');
    setSelectedArea('all');
    setSelectedCategory('all');
    setSelectedBackground('all');
    setSelectedTime('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && <Header />}

      {/* Hero Section */}
      {!embedded && (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
          <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-accent/40 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full bg-tutor/30 blur-[120px] pointer-events-none" />
          <div className="container mx-auto px-4 pt-12 pb-14 relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-5 border border-primary-foreground/20">
                <Sparkles className="h-4 w-4" />
                {totalCount} Active Opportunities
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                Find Your Perfect<br />Tuition Job
              </h1>
              <p className="text-base md:text-lg opacity-90 max-w-xl leading-relaxed">
                Discover tuition opportunities across Bangladesh. Apply instantly and start teaching today.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Profile-matched banner (embedded tutor view) */}
      {embedded && tutorPrefilterApplied && (tutorClassLevels.length > 0 || tutorSubjectIds.length > 0 || selectedDistrict !== 'all') && (
        <div className="container mx-auto px-4 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Showing jobs matched to your profile</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setTutorClassLevels([]);
                setTutorSubjectIds([]);
                setSelectedDistrict('all');
                setSelectedArea('all');
                setSelectedCategory('all');
                setSelectedBackground('all');
                setSelectedTime('all');
                setCurrentPage(1);
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* Search Bar - Floating */}
      <div className={`container mx-auto px-4 relative z-20 ${embedded ? 'pt-2' : '-mt-7'}`}>
        <div className="bg-card rounded-2xl shadow-xl border border-border p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by title, subject, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-11 h-12 rounded-xl border-0 bg-muted/50 text-base"
              />
            </div>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl px-5 relative"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button className="h-12 rounded-xl px-8 font-semibold" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">District</label>
                  <Select value={selectedDistrict} onValueChange={(v) => { setSelectedDistrict(v); setSelectedArea('all'); setCurrentPage(1); }}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Districts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Districts</SelectItem>
                      {sortedDistricts.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City (Thana)</label>
                  <Select value={selectedArea} onValueChange={(v) => { setSelectedArea(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {sortedAreas.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name_en}{!selectedDistrict || selectedDistrict === 'all' ? (a.district_name ? ` (${a.district_name})` : '') : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Job Category</label>
                  <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {JOB_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Background</label>
                  <Select value={selectedBackground} onValueChange={(v) => { setSelectedBackground(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="All Backgrounds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Backgrounds</SelectItem>
                      {STUDENT_BACKGROUNDS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Preferred Time</label>
                  <Select value={selectedTime} onValueChange={(v) => { setSelectedTime(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Any Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Time</SelectItem>
                      {TIME_OPTIONS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Active filters:</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalCount}</span> jobs available
              {totalPages > 1 && <span> · Page {currentPage} of {totalPages}</span>}
            </p>
          </div>
          {role === 'parent' && (
            <Link to="/dashboard">
              <Button size="sm" className="rounded-xl">
                <Briefcase className="h-4 w-4 mr-2" />
                Post a Job
              </Button>
            </Link>
          )}
        </div>

        {/* Job Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-muted rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-muted rounded w-2/5" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded-full w-20" />
                      <div className="h-6 bg-muted rounded-full w-24" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 bg-muted rounded w-28" />
                    <div className="h-9 bg-muted rounded-xl w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <>
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card 
                  key={job.id} 
                  className={`group rounded-2xl border transition-all duration-300 hover:shadow-lg hover:border-primary/20 ${
                    job.is_featured ? 'border-amber-300/50 bg-gradient-to-r from-amber-50/50 to-card ring-1 ring-amber-200/30' : ''
                  }`}
                >
                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Left: Icon */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${
                        job.is_featured ? 'bg-amber-100' : 'bg-primary/5'
                      }`}>
                        {getTeachingModeIcon(job.teaching_mode)}
                      </div>

                      {/* Center: Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-1">
                          {job.is_featured && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0">
                              <Sparkles className="h-3 w-3 mr-0.5" />
                              Featured
                            </Badge>
                          )}
                          {job.job_reference && (
                            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 rounded-md">
                              {job.job_reference}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                          {job.title}
                        </h3>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.areas?.name_en
                              ? `${job.areas.name_en}, ${job.districts?.name_en || ''}`
                              : job.districts?.name_en || 'N/A'}
                          </span>
                          <span className="text-border">·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatExactDate(new Date(job.created_at))}
                          </span>
                        </div>

                        <p className="text-muted-foreground text-sm line-clamp-1 mb-3">
                          {job.description}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {job.job_subjects && job.job_subjects.length > 0 ? (
                            job.job_subjects.slice(0, 3).map((js, idx) => (
                              <Badge key={idx} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 text-xs font-medium rounded-lg px-2.5">
                                {js.subjects.name_en}
                              </Badge>
                            ))
                          ) : job.subjects ? (
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 text-xs font-medium rounded-lg px-2.5">
                              {job.subjects.name_en}
                            </Badge>
                          ) : null}
                          {job.job_subjects && job.job_subjects.length > 3 && (
                            <Badge variant="outline" className="text-xs rounded-lg">+{job.job_subjects.length - 3}</Badge>
                          )}
                          {job.class_level && (
                            <Badge variant="outline" className="text-xs rounded-lg">{job.class_level}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs rounded-lg">
                            {getTeachingModeLabel(job.teaching_mode)}
                          </Badge>
                          {job.preferred_tutor_gender !== 'any' && (
                            <Badge variant="outline" className="text-xs rounded-lg">
                              {getGenderLabel(job.preferred_tutor_gender)}
                            </Badge>
                          )}
                          {job.days_per_week && (
                            <Badge variant="outline" className="text-xs rounded-lg">
                              {job.days_per_week}d/wk
                              {job.duration_hours ? ` · ${job.duration_hours}hr` : ''}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right: Price & Actions */}
                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 md:min-w-[140px]">
                        <div className="text-right">
                          <div className="text-xl md:text-2xl font-bold text-primary tabular-nums">
                            ৳{(job.budget_min || 0).toLocaleString()}-{(job.budget_max || 0).toLocaleString()}
                          </div>
                          <p className="text-[11px] text-muted-foreground font-medium">per month</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {job.total_applications} applied
                        </div>

                        <div className="flex gap-2">
                          <Link to={`/jobs/${(job as any).slug || job.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl text-xs h-9">
                              Details
                            </Button>
                          </Link>
                          <Button size="sm" className="rounded-xl text-xs h-9" onClick={() => handleApply(job)}>
                            Apply
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9 h-9 rounded-xl"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
              <Search className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Try adjusting your filters or check back later for new opportunities
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" className="rounded-xl" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
            {role === 'parent' && (
              <Link to="/dashboard">
                <Button className="rounded-xl ml-2">Post a Tuition Job</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Application Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Application</DialogTitle>
            <DialogDescription>{selectedJob?.title}</DialogDescription>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground">
            You're about to apply for this tuition job. The guardian will review your profile and contact you if shortlisted.
            {selectedJob && (
              <p className="mt-3 text-foreground">
                Parent's budget: <span className="font-medium">৳{selectedJob.budget_min?.toLocaleString()} - ৳{selectedJob.budget_max?.toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Profile completeness gate */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Profile Completeness</span>
              <span className={`font-semibold ${tutorProfileCompleteness >= minCompleteness ? 'text-success' : 'text-warning'}`}>
                {tutorProfileCompleteness}% / {minCompleteness}% required
              </span>
            </div>
            <div className="relative">
              <Progress value={tutorProfileCompleteness} className="h-2" />
              {/* Threshold marker */}
              <div
                className="absolute top-[-3px] h-[14px] w-0.5 bg-foreground/70"
                style={{ left: `${minCompleteness}%` }}
                title={`Required threshold: ${minCompleteness}%`}
              />
            </div>
            {tutorProfileCompleteness < minCompleteness && (
              <div className="flex items-start gap-1.5 text-[11px] text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Complete your profile to reach the {minCompleteness}% threshold required to apply.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyModal(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={submitApplication} disabled={applying} className="rounded-xl">
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm Apply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!embedded && <Footer />}
    </div>
  );
}
