import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { SPECIAL_REQUIREMENTS } from '@/constants/specialRequirements';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  GraduationCap, LogOut, Globe, Plus, MapPin, BookOpen, MessageSquare,
  Star, Briefcase, Users, Clock, CheckCircle2, XCircle, Search, ArrowRight,
  Eye, Edit, Trash2, Calendar
} from 'lucide-react';

interface District { id: string; name_en: string; name_bn: string; }
interface Subject { id: string; name_en: string; name_bn: string; }

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  total_applications: number;
  created_at: string;
  budget_min: number;
  budget_max: number;
  teaching_mode: string;
  days_per_week: number;
  districts: { name_en: string; name_bn: string };
  subjects: { name_en: string; name_bn: string } | null;
}

interface Application {
  id: string;
  status: string;
  proposed_rate: number;
  cover_message: string;
  created_at: string;
  tutor_profiles: {
    id: string;
    user_id: string;
    bio: string;
    education: string;
    experience_years: number;
    average_rating: number;
    total_reviews: number;
    verification_status: string;
    profiles: { full_name: string; avatar_url: string };
  };
}

export default function ParentDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [districts, setDistricts] = useState<District[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoBookings, setDemoBookings] = useState<any[]>([]);
  const [showPostJob, setShowPostJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    district_id: '',
    class_level: '',
    days_per_week: 3,
    budget_min: 3000,
    budget_max: 8000,
    teaching_mode: 'in_person',
    preferred_tutor_gender: 'any',
    student_gender: 'any',
    special_requirements: [] as string[],
    preferred_time: '',
  });

  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;

    const [districtsRes, subjectsRes, profileRes, jobsRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
      supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
      supabase.from('jobs')
        .select('*, districts (name_en, name_bn), subjects (name_en, name_bn)')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (profileRes.data) setUserProfile(profileRes.data);
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);

    // Fetch demo bookings
    const { data: bookingsData } = await supabase
      .from('demo_bookings')
      .select('*, subjects(name_en, name_bn), tutor_profiles:tutor_id(id, profiles:user_id(full_name, avatar_url))')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (bookingsData) setDemoBookings(bookingsData);

    setLoading(false);
  };

  const fetchApplications = async (jobId: string) => {
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        tutor_profiles (
          id, user_id, bio, education, experience_years, average_rating, total_reviews, verification_status,
          profiles:user_id (full_name, avatar_url)
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (data) setApplications(data as unknown as Application[]);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const { error } = await supabase.from('jobs').insert({
      parent_id: user.id,
      title: jobForm.title,
      description: jobForm.description,
      subject_id: jobForm.subject_id || null,
      district_id: jobForm.district_id,
      class_level: jobForm.class_level,
      days_per_week: jobForm.days_per_week,
      budget_min: jobForm.budget_min,
      budget_max: jobForm.budget_max,
      teaching_mode: jobForm.teaching_mode as 'online' | 'in_person' | 'hybrid',
      preferred_tutor_gender: jobForm.preferred_tutor_gender as 'male' | 'female' | 'any',
      student_gender: jobForm.student_gender as 'male' | 'female' | 'any',
      special_requirements: jobForm.special_requirements.length > 0 ? jobForm.special_requirements.join(', ') : null,
      preferred_time: jobForm.preferred_time || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Job posted successfully' });
      setShowPostJob(false);
      resetJobForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const resetJobForm = () => {
    setJobForm({
      title: '', description: '', subject_id: '', district_id: '', class_level: '',
      days_per_week: 3, budget_min: 3000, budget_max: 8000,
      teaching_mode: 'in_person', preferred_tutor_gender: 'any', student_gender: 'any',
      special_requirements: [] as string[], preferred_time: '',
    });
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Job deleted successfully' });
      fetchData();
      setSelectedJob(null);
    }
  };

  const handleApplicationAction = async (appId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Application ${status}.` });
      if (status === 'accepted' && selectedJob) {
        await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', selectedJob.id);
        fetchData();
      }
      if (selectedJob) fetchApplications(selectedJob.id);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const openJobs = jobs.filter(j => j.status === 'open');
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Manage Tutor</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
              <Globe className="h-4 w-4 mr-1" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.avatar_url || ''} />
              <AvatarFallback className="text-xl">{userProfile?.full_name?.charAt(0) || 'P'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {userProfile?.full_name || 'Parent'}!</h1>
              <Badge className="bg-parent text-parent-foreground mt-1">Parent</Badge>
            </div>
          </div>
          <Dialog open={showPostJob} onOpenChange={setShowPostJob}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post a Tuition Job</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePostJob} className="space-y-4 mt-4">
                <div>
                  <Label>Job Title *</Label>
                  <Input
                    placeholder="e.g., Math Tutor Needed for Class 10 Student"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    placeholder="Describe your requirements, schedule preferences, etc."
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <Select value={jobForm.subject_id} onValueChange={(v) => setJobForm({ ...jobForm, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{language === 'en' ? s.name_en : s.name_bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Select value={jobForm.district_id} onValueChange={(v) => setJobForm({ ...jobForm, district_id: v })} required>
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent>
                        {districts.map(d => (
                          <SelectItem key={d.id} value={d.id}>{language === 'en' ? d.name_en : d.name_bn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Class Level</Label>
                    <Select value={jobForm.class_level} onValueChange={(v) => setJobForm({ ...jobForm, class_level: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class level" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {CLASS_LEVELS.map((group) => (
                          <SelectGroup key={group.group}>
                            <SelectLabel>{group.group}</SelectLabel>
                            {group.items.map((item) => (
                              <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Days per Week</Label>
                    <Select value={String(jobForm.days_per_week)} onValueChange={(v) => setJobForm({ ...jobForm, days_per_week: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} day{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Budget Min (৳/month)</Label>
                    <Input
                      type="number"
                      value={jobForm.budget_min}
                      onChange={(e) => setJobForm({ ...jobForm, budget_min: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Budget Max (৳/month)</Label>
                    <Input
                      type="number"
                      value={jobForm.budget_max}
                      onChange={(e) => setJobForm({ ...jobForm, budget_max: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Teaching Mode</Label>
                    <Select value={jobForm.teaching_mode} onValueChange={(v) => setJobForm({ ...jobForm, teaching_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In-Person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preferred Tutor Gender</Label>
                    <Select value={jobForm.preferred_tutor_gender} onValueChange={(v) => setJobForm({ ...jobForm, preferred_tutor_gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Student Gender</Label>
                    <Select value={jobForm.student_gender} onValueChange={(v) => setJobForm({ ...jobForm, student_gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Time (Optional)</Label>
                    <Select value={jobForm.preferred_time} onValueChange={(v) => setJobForm({ ...jobForm, preferred_time: v })}>
                      <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (6AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
                        <SelectItem value="evening">Evening (4PM - 8PM)</SelectItem>
                        <SelectItem value="night">Night (8PM - 10PM)</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="mb-2 block">Special Requirements (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SPECIAL_REQUIREMENTS.map((req) => (
                        <label key={req} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={jobForm.special_requirements.includes(req)}
                            onCheckedChange={(checked) => {
                              setJobForm(prev => ({
                                ...prev,
                                special_requirements: checked
                                  ? [...prev.special_requirements, req]
                                  : prev.special_requirements.filter(r => r !== req)
                              }));
                            }}
                          />
                          {req}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post Job'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Jobs</p>
                  <p className="text-3xl font-bold">{openJobs.length}</p>
                </div>
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Tutors</p>
                  <p className="text-3xl font-bold text-success">{activeJobs.length}</p>
                </div>
                <Users className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-accent">{completedJobs.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Link to="/tutors">
            <Card className="hover-lift cursor-pointer h-28">
              <CardContent className="p-4 flex items-center gap-4 h-full">
                <div className="h-12 w-12 rounded-xl bg-tutor/10 flex items-center justify-center flex-shrink-0">
                  <Search className="h-6 w-6 text-tutor" />
                </div>
                <div>
                  <h3 className="font-bold">Find Tutors</h3>
                  <p className="text-xs text-muted-foreground">Browse verified tutors</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/messages">
            <Card className="hover-lift cursor-pointer h-28">
              <CardContent className="p-4 flex items-center gap-4 h-full">
                <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-bold">Messages</h3>
                  <p className="text-xs text-muted-foreground">Chat with tutors</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Dialog open={showPostJob} onOpenChange={setShowPostJob}>
            <DialogTrigger asChild>
              <Card className="hover-lift cursor-pointer h-28 border-dashed border-2 border-primary/30">
                <CardContent className="p-4 flex items-center gap-4 h-full">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">Post a Job</h3>
                    <p className="text-xs text-muted-foreground">Find the perfect tutor</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Tuition Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length > 0 ? (
              <Tabs defaultValue="open">
                <TabsList className="mb-4">
                  <TabsTrigger value="open">Open ({openJobs.length})</TabsTrigger>
                  <TabsTrigger value="in_progress">Active ({activeJobs.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
                </TabsList>

                {['open', 'in_progress', 'completed'].map(status => (
                  <TabsContent key={status} value={status} className="space-y-4">
                    {jobs.filter(j => j.status === status).map(job => (
                      <div 
                        key={job.id} 
                        className={`p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer ${selectedJob?.id === job.id ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => {
                          setSelectedJob(job);
                          fetchApplications(job.id);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold mb-1">{job.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {language === 'en' ? job.districts?.name_en : job.districts?.name_bn}
                              </span>
                              {job.subjects && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {language === 'en' ? job.subjects.name_en : job.subjects.name_bn}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {job.days_per_week} days/week
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">৳{job.budget_min}-{job.budget_max}/mo</Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-primary">{job.total_applications}</div>
                              <div className="text-xs text-muted-foreground">applications</div>
                            </div>
                            {job.status === 'open' && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteJob(job.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {jobs.filter(j => j.status === status).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No {status.replace('_', ' ')} jobs</p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold mb-2">No jobs posted yet</h3>
                <p className="text-muted-foreground mb-4">Post your first tuition job to find the perfect tutor</p>
                <Button onClick={() => setShowPostJob(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications Panel */}
        {selectedJob && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Applications for "{selectedJob.title}"
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app.id} className="p-4 border rounded-xl">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={app.tutor_profiles?.profiles?.avatar_url} />
                          <AvatarFallback>{app.tutor_profiles?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold">{app.tutor_profiles?.profiles?.full_name}</h4>
                            {app.tutor_profiles?.verification_status === 'approved' && (
                              <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                            )}
                            <Badge className={
                              app.status === 'accepted' ? 'bg-success' :
                              app.status === 'rejected' ? 'bg-destructive' :
                              'bg-warning text-warning-foreground'
                            }>
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {app.tutor_profiles?.experience_years} yrs experience • 
                            <Star className="h-3 w-3 inline ml-1 text-accent" /> {app.tutor_profiles?.average_rating || 0}
                            ({app.tutor_profiles?.total_reviews || 0} reviews)
                          </p>
                          <p className="text-sm mb-2">{app.cover_message}</p>
                          <Badge variant="outline">Proposed: ৳{app.proposed_rate}/month</Badge>
                        </div>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <Button size="sm" onClick={() => handleApplicationAction(app.id, 'accepted')}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleApplicationAction(app.id, 'rejected')}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Link to={`/messages?with=${app.tutor_profiles?.user_id}&job=${selectedJob.id}`}>
                            <Button size="sm" variant="ghost">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Chat
                            </Button>
                          </Link>
                        </div>
                      )}

                      {app.status === 'accepted' && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          <Link to={`/messages?with=${app.tutor_profiles?.user_id}&job=${selectedJob.id}`}>
                            <Button size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Message Tutor
                            </Button>
                          </Link>
                          <Link to={`/tutor/${app.tutor_profiles?.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No applications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Demo Class Bookings */}
        {demoBookings.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Demo Class Bookings
              </CardTitle>
              <CardDescription>Track your trial lesson requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoBookings.map((booking: any) => (
                <div key={booking.id} className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">
                          {booking.tutor_profiles?.profiles?.full_name || 'Tutor'}
                        </h4>
                        {booking.subjects && (
                          <Badge variant="secondary">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {language === 'en' ? booking.subjects.name_en : booking.subjects.name_bn}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(booking.preferred_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {booking.preferred_time} ({booking.duration_minutes} min)
                        </span>
                        <span className="font-medium text-primary">৳{booking.class_fee}</span>
                      </div>
                    </div>
                    <Badge className={
                      booking.status === 'confirmed' ? 'bg-success' :
                      booking.status === 'completed' ? 'bg-primary' :
                      booking.status === 'cancelled' ? 'bg-destructive' :
                      'bg-warning text-warning-foreground'
                    }>
                      {booking.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {booking.status === 'confirmed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
