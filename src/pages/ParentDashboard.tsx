import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/SearchableSelect';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { SPECIAL_REQUIREMENTS } from '@/constants/specialRequirements';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, differenceInHours, format } from 'date-fns';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { NotificationBell } from '@/components/NotificationBell';
import {
  GraduationCap, LogOut, Globe, Plus, MapPin, BookOpen,
  Star, Briefcase, Users, Clock, CheckCircle2, XCircle, Search, ArrowRight,
  Eye, Edit, Trash2, Calendar, Home, Heart, AlertCircle,
  User, CreditCard, Pause, Play, Flag, Zap,
  Send, AlertTriangle, Receipt, DollarSign
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
  job_reference: string;
  subject_id: string | null;
  district_id: string;
  class_level: string | null;
  preferred_tutor_gender: string | null;
  student_gender: string | null;
  special_requirements: string | null;
  preferred_time: string | null;
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
    education_detail: string | null;
    experience_years: number;
    average_rating: number;
    total_reviews: number;
    total_students: number;
    verification_status: string;
    teaching_mode: string;
    gender: string;
    hourly_rate_min: number | null;
    hourly_rate_max: number | null;
    is_available: boolean;
    district_id: string | null;
    districts: { name_en: string; name_bn: string } | null;
    profiles: { full_name: string; avatar_url: string };
    tutor_subjects: { subjects: { name_en: string; name_bn: string } }[];
  };
}

interface UserProfileFull {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string;
  district_id: string | null;
  area_id: string | null;
  user_reference: string | null;
}

const sidebarItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Find Tutors', url: '/tutors', icon: Search },
  { title: 'Browse Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Favorites', url: '/favorites', icon: Heart },
  { title: 'Pricing', url: '/pricing', icon: CreditCard },
];

function ParentSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span className="font-bold">Manage Tutor</span>
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [showPostJob, setShowPostJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetApp, setReportTargetApp] = useState<Application | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportType, setReportType] = useState('no_show');

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

  const [userProfile, setUserProfile] = useState<UserProfileFull | null>(null);

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
      supabase.from('profiles').select('full_name, avatar_url, phone, email, district_id, area_id, user_reference').eq('id', user.id).single(),
      supabase.from('jobs')
        .select('*, districts (name_en, name_bn), subjects (name_en, name_bn)')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (profileRes.data) setUserProfile(profileRes.data as UserProfileFull);
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);

    const { data: bookingsData } = await supabase
      .from('demo_bookings')
      .select('*, subjects(name_en, name_bn), tutor_profiles:tutor_id(id, profiles:user_id(full_name, avatar_url))')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (bookingsData) setDemoBookings(bookingsData);

    // Fetch payment transactions
    const { data: txnData } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txnData) setTransactions(txnData);

    // Fetch subscription
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(name, price_monthly)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subData) setSubscription(subData);

    setLoading(false);
  };

  const fetchApplications = async (jobId: string) => {
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        tutor_profiles (
          id, user_id, bio, education, education_detail, experience_years, 
          average_rating, total_reviews, total_students, verification_status,
          teaching_mode, gender, hourly_rate_min, hourly_rate_max, is_available,
          district_id, districts (name_en, name_bn),
          profiles:user_id (full_name, avatar_url),
          tutor_subjects (subjects (name_en, name_bn))
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
      if (selectedJob?.id === jobId) setSelectedJob(null);
    }
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    const { error } = await supabase.from('jobs').update({ status: status as 'open' | 'in_progress' | 'completed' | 'cancelled' }).eq('id', jobId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const labels: Record<string, string> = {
        cancelled: 'Job paused',
        open: 'Job reactivated',
        completed: 'Job marked as completed',
        in_progress: 'Job marked as in progress',
      };
      toast({ title: 'Updated', description: labels[status] || 'Job status updated' });
      fetchData();
    }
  };

  const startEditJob = (job: Job) => {
    setJobForm({
      title: job.title,
      description: job.description,
      subject_id: job.subject_id || '',
      district_id: job.district_id,
      class_level: job.class_level || '',
      days_per_week: job.days_per_week || 3,
      budget_min: job.budget_min || 3000,
      budget_max: job.budget_max || 8000,
      teaching_mode: job.teaching_mode || 'in_person',
      preferred_tutor_gender: job.preferred_tutor_gender || 'any',
      student_gender: job.student_gender || 'any',
      special_requirements: job.special_requirements ? job.special_requirements.split(', ') : [],
      preferred_time: job.preferred_time || '',
    });
    setEditingJob(job);
    setShowPostJob(true);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingJob) return;

    setSubmitting(true);
    const { error } = await supabase.from('jobs').update({
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
    }).eq('id', editingJob.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated!', description: 'Job updated successfully' });
      setShowPostJob(false);
      setEditingJob(null);
      resetJobForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const handleApplicationAction = async (appId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Application ${status}.` });
      if (status === 'accepted' && selectedJob) {
        await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', selectedJob.id);
        // Notify the tutor
        const app = applications.find(a => a.id === appId);
        if (app?.tutor_profiles?.user_id) {
          await supabase.from('notifications').insert({
            user_id: app.tutor_profiles.user_id,
            title: 'You have been hired!',
            message: `Congratulations! You have been selected for "${selectedJob.title}".`,
            type: 'hired',
            reference_id: selectedJob.id,
          });
        }
        fetchData();
      }
      if (selectedJob) fetchApplications(selectedJob.id);
    }
  };

  const handleInviteToInterview = async (app: Application) => {
    if (!selectedJob || !app.tutor_profiles?.user_id) return;
    // Notify tutor about interview invitation
    const { error } = await supabase.from('notifications').insert({
      user_id: app.tutor_profiles.user_id,
      title: 'Interview Invitation',
      message: `You have been shortlisted for "${selectedJob.title}". The parent would like to schedule a demo class with you.`,
      type: 'interview_invite',
      reference_id: selectedJob.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invitation Sent', description: 'The tutor has been notified about the interview.' });
    }
  };

  const handleReportIssue = async () => {
    if (!user || !reportTargetApp) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: reportTargetApp.tutor_profiles.user_id,
      report_type: reportType,
      description: reportDescription,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Report Submitted', description: 'Your report has been sent to the admin team for review.' });
      setReportDialogOpen(false);
      setReportDescription('');
      setReportTargetApp(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getProfileCompleteness = () => {
    if (!userProfile) return { percent: 0, missing: [] as string[] };
    let complete = 0;
    const missing: string[] = [];

    if (userProfile.full_name && userProfile.full_name !== userProfile.email) {
      complete += 25;
    } else {
      missing.push('Full Name');
    }
    if (userProfile.phone) {
      complete += 25;
    } else {
      missing.push('Phone Number');
    }
    if (userProfile.district_id) {
      complete += 25;
    } else {
      missing.push('Location');
    }
    if (userProfile.avatar_url) {
      complete += 25;
    } else {
      missing.push('Profile Photo');
    }

    return { percent: complete, missing };
  };

  const districtOptions = useMemo(() => districts.map(d => ({
    value: d.id,
    label: language === 'en' ? d.name_en : d.name_bn,
  })), [districts, language]);

  const subjectOptions = useMemo(() => subjects.map(s => ({
    value: s.id,
    label: language === 'en' ? s.name_en : s.name_bn,
  })), [subjects, language]);

  const classLevelOptions = useMemo(() => CLASS_LEVELS.flatMap(group =>
    group.items.map(item => ({ value: item, label: item, group: group.group }))
  ), []);

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
  const pausedJobs = jobs.filter(j => j.status === 'cancelled');
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.total_applications || 0), 0);
  const shortlistedCount = applications.filter(a => a.status === 'accepted').length;
  const profileInfo = getProfileCompleteness();

  // Determine jobs that need boost (open for 24h+ with 0 applications)
  const boostCandidates = openJobs.filter(j => {
    const hoursLive = differenceInHours(new Date(), new Date(j.created_at));
    return hoursLive >= 24 && (j.total_applications || 0) === 0;
  });

  const filteredJobs = jobStatusFilter === 'all'
    ? jobs
    : jobs.filter(j => j.status === jobStatusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-primary';
      case 'in_progress': return 'bg-success';
      case 'completed': return 'bg-accent';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Active';
      case 'in_progress': return 'Hired';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Paused';
      default: return status;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ParentSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-lg font-bold hidden sm:inline">Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
                <Globe className="h-4 w-4 mr-1" />
                {language === 'en' ? 'বাংলা' : 'EN'}
              </Button>
              <Dialog open={showPostJob} onOpenChange={(open) => {
                setShowPostJob(open);
                if (!open) { setEditingJob(null); resetJobForm(); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Post Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingJob ? 'Edit Tuition Job' : 'Post a Tuition Job'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={editingJob ? handleUpdateJob : handlePostJob} className="space-y-4 mt-4">
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
                        <SearchableSelect
                          options={subjectOptions}
                          value={jobForm.subject_id}
                          onValueChange={(v) => setJobForm({ ...jobForm, subject_id: v })}
                          placeholder="Search subject..."
                          searchPlaceholder="Type to search subjects..."
                          emptyText="No subjects found."
                        />
                      </div>
                      <div>
                        <Label>Location *</Label>
                        <SearchableSelect
                          options={districtOptions}
                          value={jobForm.district_id}
                          onValueChange={(v) => setJobForm({ ...jobForm, district_id: v })}
                          placeholder="Search district..."
                          searchPlaceholder="Type to search districts..."
                          emptyText="No districts found."
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Class Level</Label>
                        <SearchableSelect
                          options={classLevelOptions}
                          value={jobForm.class_level}
                          onValueChange={(v) => setJobForm({ ...jobForm, class_level: v })}
                          placeholder="Search class level..."
                          searchPlaceholder="Type to search..."
                          emptyText="No class levels found."
                          grouped
                        />
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
                      {submitting ? (editingJob ? 'Updating...' : 'Posting...') : (editingJob ? 'Update Job' : 'Post Job')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {/* Welcome Header */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-14 w-14">
                <AvatarImage src={userProfile?.avatar_url || ''} />
                <AvatarFallback className="text-xl">{userProfile?.full_name?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">Welcome, {userProfile?.full_name || 'Parent'}!</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-parent text-parent-foreground">Parent / Guardian</Badge>
                  {userProfile?.user_reference && (
                    <Badge variant="outline" className="font-mono text-xs">{userProfile.user_reference}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Your Profile */}
            {profileInfo.percent < 100 && (
              <Card className="mb-6 border-warning/50 bg-warning/5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-8 w-8 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">Complete Your Profile</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        A complete profile helps tutors understand your needs better.
                      </p>
                      <Progress value={profileInfo.percent} className="h-2 mb-3" />
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {profileInfo.missing.map((item) => (
                            <Badge key={item} variant="outline" className="text-warning border-warning/50">
                              {item}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">{profileInfo.percent}% complete</span>
                        <Link to="/parent/profile">
                          <Button size="sm">Edit Profile</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Boost Post Alert */}
            {boostCandidates.length > 0 && (
              <Card className="mb-6 border-accent/50 bg-accent/5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Zap className="h-8 w-8 text-accent flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">Boost Your Job Posts</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {boostCandidates.length} job{boostCandidates.length > 1 ? 's have' : ' has'} been live for 24+ hours with no applicants. Consider increasing the offered salary or editing the requirements.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {boostCandidates.map(job => (
                          <Button
                            key={job.id}
                            size="sm"
                            variant="outline"
                            onClick={() => startEditJob(job)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit "{job.title}"
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Jobs</p>
                      <p className="text-3xl font-bold">{openJobs.length}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Applicants</p>
                      <p className="text-3xl font-bold text-accent">{totalApplicants}</p>
                    </div>
                    <Users className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Hired Tutors</p>
                      <p className="text-3xl font-bold text-success">{activeJobs.length}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-3xl font-bold">{completedJobs.length}</p>
                    </div>
                    <Star className="h-8 w-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setShowPostJob(true)}>
                <Plus className="h-5 w-5 mr-2 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Post New Job</div>
                  <div className="text-xs text-muted-foreground">Find a tutor for your child</div>
                </div>
              </Button>
              <Link to="/tutors" className="block">
                <Button variant="outline" className="justify-start h-auto py-3 w-full">
                  <Search className="h-5 w-5 mr-2 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Browse Tutors</div>
                    <div className="text-xs text-muted-foreground">View available tutor profiles</div>
                  </div>
                </Button>
              </Link>
              <Link to="/favorites" className="block">
                <Button variant="outline" className="justify-start h-auto py-3 w-full">
                  <Heart className="h-5 w-5 mr-2 text-destructive" />
                  <div className="text-left">
                    <div className="font-medium">My Favorites</div>
                    <div className="text-xs text-muted-foreground">Shortlisted tutors</div>
                  </div>
                </Button>
              </Link>
            </div>

            {/* Jobs List with Status Filter */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    My Tuition Jobs
                  </CardTitle>
                  <Link to="/jobs">
                    <Button variant="ghost" size="sm">
                      View All Jobs <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {jobs.length > 0 ? (
                  <>
                    <Tabs value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                      <TabsList className="mb-4 flex-wrap">
                        <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
                        <TabsTrigger value="open">Active ({openJobs.length})</TabsTrigger>
                        <TabsTrigger value="in_progress">Hired ({activeJobs.length})</TabsTrigger>
                        <TabsTrigger value="cancelled">Paused ({pausedJobs.length})</TabsTrigger>
                        <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-4">
                      {filteredJobs.map(job => {
                        const hoursLive = differenceInHours(new Date(), new Date(job.created_at));
                        const daysLive = Math.floor(hoursLive / 24);
                        const needsBoost = job.status === 'open' && hoursLive >= 24 && (job.total_applications || 0) === 0;

                        return (
                          <div
                            key={job.id}
                            className={`p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer ${selectedJob?.id === job.id ? 'border-primary bg-primary/5' : ''} ${needsBoost ? 'border-accent/50' : ''}`}
                            onClick={() => {
                              setSelectedJob(job);
                              fetchApplications(job.id);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-bold">{job.title}</h4>
                                  {job.job_reference && (
                                    <Badge variant="outline" className="text-xs font-mono">{job.job_reference}</Badge>
                                  )}
                                  <Badge className={getStatusColor(job.status)}>
                                    {getStatusLabel(job.status)}
                                  </Badge>
                                  {needsBoost && (
                                    <Badge variant="outline" className="text-accent border-accent/50">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Needs Boost
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
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
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {daysLive > 0 ? `${daysLive}d` : `${hoursLive}h`} live
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">৳{job.budget_min}-{job.budget_max}/mo</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-center mr-2">
                                  <div className="text-lg font-bold text-primary">{job.total_applications}</div>
                                  <div className="text-xs text-muted-foreground">applicants</div>
                                </div>
                                {/* Action buttons */}
                                <div className="flex gap-1">
                                  {(job.status === 'open' || job.status === 'cancelled') && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Edit"
                                      onClick={(e) => { e.stopPropagation(); startEditJob(job); }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {job.status === 'open' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Pause Job"
                                      onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'cancelled'); }}
                                    >
                                      <Pause className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {job.status === 'cancelled' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Reactivate Job"
                                      className="text-success"
                                      onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'open'); }}
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {job.status === 'in_progress' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Mark Completed"
                                      className="text-success"
                                      onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'completed'); }}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(job.status === 'open' || job.status === 'cancelled') && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive"
                                      title="Delete"
                                      onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredJobs.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No jobs in this category</p>
                        </div>
                      )}
                    </div>
                  </>
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
                      <Badge variant="outline">{applications.length}</Badge>
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length > 0 ? (
                    <div className="space-y-4">
                      {applications.map(app => {
                        const tutor = app.tutor_profiles;
                        const tutorSubjects = tutor?.tutor_subjects?.map(ts => 
                          language === 'en' ? ts.subjects?.name_en : ts.subjects?.name_bn
                        ).filter(Boolean) || [];

                        return (
                        <div key={app.id} className="p-4 border rounded-xl">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={tutor?.profiles?.avatar_url} />
                              <AvatarFallback className="text-lg">{tutor?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-bold text-lg">{tutor?.profiles?.full_name}</h4>
                                {tutor?.verification_status === 'approved' && (
                                  <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                                )}
                                {tutor?.is_available && (
                                  <Badge variant="outline" className="text-success border-success/50">Available</Badge>
                                )}
                                <Badge className={
                                  app.status === 'accepted' ? 'bg-success' :
                                  app.status === 'rejected' ? 'bg-destructive' :
                                  'bg-warning text-warning-foreground'
                                }>
                                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                </Badge>
                              </div>

                              {/* Quick Stats Row */}
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {tutor?.experience_years || 0} yrs exp
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-accent" /> {tutor?.average_rating || 0}
                                  ({tutor?.total_reviews || 0} reviews)
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {tutor?.total_students || 0} students
                                </span>
                                {tutor?.districts && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {language === 'en' ? tutor.districts.name_en : tutor.districts.name_bn}
                                  </span>
                                )}
                              </div>

                              {/* Cover Message */}
                              <p className="text-sm mb-3 bg-muted/50 p-3 rounded-lg italic">"{app.cover_message}"</p>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="font-semibold">Proposed: ৳{app.proposed_rate}/month</Badge>
                                {tutor?.teaching_mode && (
                                  <Badge variant="secondary">
                                    {tutor.teaching_mode === 'in_person' ? 'In-Person' : tutor.teaching_mode === 'online' ? 'Online' : 'Hybrid'}
                                  </Badge>
                                )}
                                {tutor?.gender && (
                                  <Badge variant="secondary" className="capitalize">{tutor.gender}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Full Profile Section */}
                          <details className="mt-4 pt-4 border-t group">
                            <summary className="cursor-pointer text-sm font-medium text-primary flex items-center gap-1 hover:underline list-none">
                              <Eye className="h-4 w-4" />
                              View Full Profile Details
                              <ArrowRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="mt-4 space-y-4">
                              {(tutor?.education || tutor?.education_detail) && (
                                <div>
                                  <h5 className="text-sm font-bold flex items-center gap-1 mb-1">
                                    <GraduationCap className="h-4 w-4" /> Education
                                  </h5>
                                  {tutor?.education && <p className="text-sm text-muted-foreground">{tutor.education}</p>}
                                  {tutor?.education_detail && <p className="text-sm text-muted-foreground mt-1">{tutor.education_detail}</p>}
                                </div>
                              )}
                              {tutor?.bio && (
                                <div>
                                  <h5 className="text-sm font-bold flex items-center gap-1 mb-1">
                                    <User className="h-4 w-4" /> About
                                  </h5>
                                  <p className="text-sm text-muted-foreground">{tutor.bio}</p>
                                </div>
                              )}
                              {tutorSubjects.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-bold flex items-center gap-1 mb-1">
                                    <BookOpen className="h-4 w-4" /> Subjects
                                  </h5>
                                  <div className="flex flex-wrap gap-1.5">
                                    {tutorSubjects.map((s, i) => (
                                      <Badge key={i} variant="outline">{s}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(tutor?.hourly_rate_min || tutor?.hourly_rate_max) && (
                                <div>
                                  <h5 className="text-sm font-bold flex items-center gap-1 mb-1">
                                    <CreditCard className="h-4 w-4" /> Expected Rate
                                  </h5>
                                  <p className="text-sm text-muted-foreground">
                                    ৳{tutor.hourly_rate_min || '—'} – ৳{tutor.hourly_rate_max || '—'} / month
                                  </p>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground italic pt-2">
                                Contact details will be shared after you accept this application.
                              </div>
                            </div>
                          </details>

                          {/* Action Buttons */}
                          {app.status === 'pending' && (
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
                              <Button size="sm" onClick={() => handleApplicationAction(app.id, 'accepted')}>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Hire This Tutor
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleInviteToInterview(app)}>
                                <Send className="h-4 w-4 mr-1" />
                                Invite to Interview
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleApplicationAction(app.id, 'rejected')}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}

                          {app.status === 'accepted' && (
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
                              <Link to={`/tutor/${tutor?.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Public Profile
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => {
                                  setReportTargetApp(app);
                                  setReportDialogOpen(true);
                                }}
                              >
                                <Flag className="h-4 w-4 mr-1" />
                                Report Issue
                              </Button>
                            </div>
                          )}
                        </div>
                        );
                      })}
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
              <Card className="mt-6">
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
      </div>

      {/* Report Issue Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Report an Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Report a problem with {reportTargetApp?.tutor_profiles?.profiles?.full_name || 'the tutor'}. Our admin team will review your report.
            </p>
            <div>
              <Label>Issue Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_show">Tutor Not Showing Up</SelectItem>
                  <SelectItem value="unprofessional">Unprofessional Behavior</SelectItem>
                  <SelectItem value="quality">Poor Teaching Quality</SelectItem>
                  <SelectItem value="communication">Communication Issues</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!reportDescription.trim()}
              onClick={handleReportIssue}
            >
              <Flag className="h-4 w-4 mr-2" />
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
