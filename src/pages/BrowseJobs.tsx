import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  GraduationCap, Search, MapPin, Globe, Briefcase, Clock, 
  BookOpen, Users, Calendar, DollarSign, ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface District {
  id: string;
  name_en: string;
  name_bn: string;
}

interface Subject {
  id: string;
  name_en: string;
  name_bn: string;
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
  districts: { name_en: string; name_bn: string };
  subjects: { name_en: string; name_bn: string } | null;
  profiles: { full_name: string };
}

export default function BrowseJobs() {
  const { t, language, setLanguage } = useLanguage();
  const { user, role } = useAuth();
  const [districts, setDistricts] = useState<District[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [selectedDistrict, selectedSubject]);

  const fetchData = async () => {
    const [districtsRes, subjectsRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
    ]);
    
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    
    await fetchJobs();
  };

  const fetchJobs = async () => {
    setLoading(true);
    
    let query = supabase
      .from('jobs')
      .select(`
        *,
        districts (name_en, name_bn),
        subjects (name_en, name_bn),
        profiles!jobs_parent_id_fkey (full_name)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (selectedDistrict && selectedDistrict !== 'all') {
      query = query.eq('district_id', selectedDistrict);
    }

    if (selectedSubject && selectedSubject !== 'all') {
      query = query.eq('subject_id', selectedSubject);
    }

    const { data, error } = await query.limit(20);
    
    if (data) {
      let filtered = data as unknown as Job[];
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(j => 
          j.title?.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q)
        );
      }
      
      setJobs(filtered);
    }
    
    setLoading(false);
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
            <Link to="/tutors" className="text-muted-foreground hover:text-primary transition-colors font-medium">Find Tutors</Link>
            <Link to="/jobs" className="text-primary font-medium">Browse Jobs</Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
              <Globe className="h-4 w-4 mr-1" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            {user ? (
              <Link to="/dashboard">
                <Button>{t('nav.dashboard')}</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button>{t('nav.login')}</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="bg-gradient-to-r from-tutor to-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Browse Tuition Jobs</h1>
          <p className="text-lg opacity-90 max-w-2xl">Find tuition opportunities that match your expertise and start teaching today</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {districts.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {language === 'en' ? d.name_en : d.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {language === 'en' ? s.name_en : s.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-12 rounded-xl px-8" onClick={fetchJobs}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">{jobs.length} jobs available</p>
          {role === 'parent' && (
            <Link to="/dashboard">
              <Button>
                <Briefcase className="h-4 w-4 mr-2" />
                Post a Job
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-20" />
                    <div className="h-6 bg-muted rounded w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover-lift group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-tutor/10 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-6 w-6 text-tutor" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {language === 'en' ? job.districts?.name_en : job.districts?.name_bn}
                            <span className="text-border">•</span>
                            Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4 ml-15">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2 ml-15">
                        {job.subjects && (
                          <Badge variant="secondary">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {language === 'en' ? job.subjects.name_en : job.subjects.name_bn}
                          </Badge>
                        )}
                        {job.class_level && (
                          <Badge variant="outline">{job.class_level}</Badge>
                        )}
                        <Badge variant="outline">
                          {getTeachingModeLabel(job.teaching_mode)}
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {getGenderLabel(job.preferred_tutor_gender)}
                        </Badge>
                        {job.days_per_week && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {job.days_per_week} days/week
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ৳{job.budget_min || 0}-{job.budget_max || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">per month</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {job.total_applications} applications
                      </div>

                      {role === 'tutor' ? (
                        <Button className="rounded-xl">
                          Apply Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button variant="outline" className="rounded-xl">
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-6">Check back later or try different filters</p>
            {role === 'parent' && (
              <Link to="/dashboard">
                <Button>Post a Tuition Job</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
