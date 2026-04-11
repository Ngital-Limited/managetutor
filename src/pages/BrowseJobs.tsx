import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, Search, MapPin, Globe, Briefcase, 
  BookOpen, Users, Calendar, ArrowRight, ChevronLeft, ChevronRight, Send, Loader2, Monitor
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
  districts: { name_en: string; name_bn: string } | null;
  subjects: { name_en: string; name_bn: string } | null;
  job_subjects?: { subjects: { name_en: string; name_bn: string } }[];
}

const JOBS_PER_PAGE = 10;

export default function BrowseJobs() {
  const { t, language, setLanguage } = useLanguage();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [districts, setDistricts] = useState<District[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');

  // Application modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [applying, setApplying] = useState(false);
  const [tutorProfileId, setTutorProfileId] = useState<string | null>(null);
  const [tutorProfileCompleteness, setTutorProfileCompleteness] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [selectedDistrict, selectedSubject, selectedMode, currentPage]);

  useEffect(() => {
    if (user && role === 'tutor') {
      fetchTutorProfile();
    }
  }, [user, role]);

  const fetchTutorProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tutor_profiles')
      .select('id, bio, education, experience_years, hourly_rate_min, verification_status, gender, district_id, teaching_mode, class_levels')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setTutorProfileId(data.id);
      // Calculate completeness (10 fields, each worth 10%)
      let complete = 0;
      if (data.bio) complete += 10;
      if (data.education) complete += 10;
      if (data.experience_years && data.experience_years > 0) complete += 10;
      if (data.hourly_rate_min && data.hourly_rate_min > 0) complete += 10;
      if (data.gender) complete += 10;
      if (data.district_id) complete += 10;
      if (data.teaching_mode) complete += 10;
      if (data.class_levels && data.class_levels.length > 0) complete += 10;
      if (data.verification_status === 'approved') complete += 10;
      // Check if tutor has subjects
      const { count } = await supabase.from('tutor_subjects').select('*', { count: 'exact', head: true }).eq('tutor_profile_id', data.id);
      if (count && count > 0) complete += 10;
      setTutorProfileCompleteness(complete);
    }
  };

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
    
    // If filtering by subject, first get matching job IDs from job_subjects
    let subjectJobIds: string[] | null = null;
    if (selectedSubject && selectedSubject !== 'all') {
      const { data: jsData } = await supabase
        .from('job_subjects')
        .select('job_id')
        .eq('subject_id', selectedSubject);
      subjectJobIds = jsData?.map(js => js.job_id) || [];
    }

    // Build count query
    let countQuery = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (selectedDistrict && selectedDistrict !== 'all') {
      countQuery = countQuery.eq('district_id', selectedDistrict);
    }
    if (subjectJobIds !== null) {
      if (subjectJobIds.length === 0) {
        setTotalCount(0);
        setJobs([]);
        setLoading(false);
        return;
      }
      countQuery = countQuery.in('id', subjectJobIds);
    }
    if (selectedMode && selectedMode !== 'all') {
      countQuery = countQuery.eq('teaching_mode', selectedMode as 'online' | 'in_person' | 'hybrid');
    }

    const { count } = await countQuery;
    setTotalCount(count || 0);

    // Build data query
    const from = (currentPage - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    let query = supabase
      .from('jobs')
      .select(`
        *,
        districts (name_en, name_bn),
        subjects (name_en, name_bn),
        job_subjects (subjects (name_en, name_bn))
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (selectedDistrict && selectedDistrict !== 'all') {
      query = query.eq('district_id', selectedDistrict);
    }

    if (subjectJobIds !== null) {
      query = query.in('id', subjectJobIds);
    }

    if (selectedMode && selectedMode !== 'all') {
      query = query.eq('teaching_mode', selectedMode as 'online' | 'in_person' | 'hybrid');
    }

    const { data, error } = await query;
    
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

  const handleApply = (job: Job) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (role !== 'tutor') {
      toast({
        title: "Tutor Account Required",
        description: "You need to register as a tutor to apply for jobs. Please create a tutor account first.",
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
    if (tutorProfileCompleteness < 70) {
      toast({
        title: "Profile Incomplete",
        description: `Your profile is ${tutorProfileCompleteness}% complete. You need at least 70% to apply for jobs.`,
        variant: "destructive"
      });
      navigate('/tutor/profile');
      return;
    }
    setSelectedJob(job);
    setCoverMessage('');
    setProposedRate(job.budget_min?.toString() || '');
    setShowApplyModal(true);
  };

  const submitApplication = async () => {
    if (!selectedJob || !tutorProfileId) {
      toast({
        title: "Error",
        description: "Unable to submit application. Please complete your tutor profile first.",
        variant: "destructive"
      });
      return;
    }

    setApplying(true);
    
    const { error } = await supabase.from('applications').insert({
      job_id: selectedJob.id,
      tutor_id: tutorProfileId,
      cover_message: coverMessage,
      proposed_rate: parseInt(proposedRate) || null,
      status: 'pending'
    });

    setApplying(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already Applied",
          description: "You have already applied for this job",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit application. Please try again.",
          variant: "destructive"
        });
      }
      return;
    }

    toast({
      title: "Application Submitted!",
      description: "Your application has been sent to the parent. Good luck!",
    });
    
    setShowApplyModal(false);
    fetchJobs(); // Refresh to update application count
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Select value={selectedDistrict} onValueChange={(v) => { setSelectedDistrict(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {districts.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMode} onValueChange={(v) => { setSelectedMode(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-40 h-12 rounded-xl">
                <Monitor className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in_person">In-Person</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-12 rounded-xl px-8" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            {totalCount} jobs available
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </p>
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
          <>
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                                {job.title}
                              </h3>
                              {(job as any).job_reference && (
                                <Badge variant="outline" className="text-xs font-mono">{(job as any).job_reference}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {job.districts ? (job.districts.name_en) : 'Location N/A'}
                              <span className="text-border">•</span>
                              Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 ml-15">
                          {job.description}
                        </p>

                        <div className="flex flex-wrap gap-2 ml-15">
                          {job.job_subjects && job.job_subjects.length > 0 ? (
                            job.job_subjects.map((js, idx) => (
                              <Badge key={idx} variant="secondary">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {js.subjects.name_en}
                              </Badge>
                            ))
                          ) : job.subjects ? (
                            <Badge variant="secondary">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {job.subjects.name_en}
                            </Badge>
                          ) : null}
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

                        <Button className="rounded-xl" onClick={() => handleApply(job)}>
                          Apply Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        <Link to={`/jobs/${job.id}`}>
                          <Button variant="outline" className="rounded-xl">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
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
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
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

      {/* Application Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply for Tuition Job</DialogTitle>
            <DialogDescription>
              {selectedJob?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="coverMessage">Cover Message</Label>
              <Textarea
                id="coverMessage"
                placeholder="Introduce yourself and explain why you're a great fit for this job..."
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proposedRate">Proposed Monthly Rate (৳)</Label>
              <Input
                id="proposedRate"
                type="number"
                placeholder="Enter your proposed rate"
                value={proposedRate}
                onChange={(e) => setProposedRate(e.target.value)}
              />
              {selectedJob && (
                <p className="text-xs text-muted-foreground">
                  Parent's budget: ৳{selectedJob.budget_min} - ৳{selectedJob.budget_max}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitApplication} disabled={applying}>
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
