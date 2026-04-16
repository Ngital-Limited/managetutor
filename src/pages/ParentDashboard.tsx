import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/SearchableSelect';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { SPECIAL_REQUIREMENTS } from '@/constants/specialRequirements';
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';
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
import { NotificationBell } from '@/components/NotificationBell';
import {
  GraduationCap, LogOut, Globe, Plus, MapPin, BookOpen,
  Star, Briefcase, Users, Clock, CheckCircle2, XCircle, Search, ArrowRight,
  Eye, Edit, Trash2, Calendar, Home, Heart, AlertCircle,
  User, CreditCard, Pause, Play, Flag, Zap,
  Send, AlertTriangle, Receipt, DollarSign, LayoutDashboard
} from 'lucide-react';

interface District { id: string; name_en: string; name_bn: string; division_en: string; division_bn: string; }
interface Subject { id: string; name_en: string; name_bn: string; }
interface Area { id: string; name_en: string; name_bn: string; district_id: string; }

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
  duration_hours: number | null;
  job_reference: string;
  subject_ids: string[];
  district_id: string;
  area_id: string | null;
  class_level: string | null;
  preferred_tutor_gender: string | null;
  student_gender: string | null;
  special_requirements: string | null;
  preferred_time: string | null;
  number_of_students: number | null;
  student_age: string | null;
  start_date: string | null;
  location_details: string | null;
  districts: { name_en: string; name_bn: string };
  subjects: { name_en: string; name_bn: string } | null;
  job_subjects?: { subjects: { name_en: string; name_bn: string } }[];
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

type SectionKey = 'overview' | 'jobs' | 'demo' | 'payments' | 'profile';

const sectionItems: { key: SectionKey; title: string; icon: any }[] = [
  { key: 'overview', title: 'Overview', icon: LayoutDashboard },
  { key: 'jobs', title: 'My Jobs', icon: Briefcase },
  { key: 'demo', title: 'Demo Classes', icon: Calendar },
  { key: 'payments', title: 'Payments', icon: CreditCard },
  { key: 'profile', title: 'My Profile', icon: User },
];

const externalLinks = [
  { title: 'Browse Tutors', url: '/tutors', icon: Search },
  { title: 'My Favorites', url: '/favorites', icon: Heart },
  { title: 'Pricing', url: '/pricing', icon: CreditCard },
];

function ParentSidebar({ activeSection, setActiveSection, onPostJob }: { activeSection: SectionKey; setActiveSection: (s: SectionKey) => void; onPostJob: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, user } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <Logo size="sm" />
            )}
          </SidebarGroupLabel>
          <div className={`flex items-center gap-3 px-3 py-3 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{profile?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onPostJob}
                  className="cursor-pointer hover:bg-primary/10 text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Post New Job</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {sectionItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(item.key)}
                    className={`cursor-pointer ${activeSection === item.key ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'}`}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && <span className="text-xs text-muted-foreground">Quick Links</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {externalLinks.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url} className="hover:bg-muted/50">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
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

  // Interview scheduling state
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState<Application | null>(null);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined);
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  const [selectedJobDivision, setSelectedJobDivision] = useState('');
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    subject_ids: [] as string[],
    district_id: '',
    area_id: '',
    class_levels: [] as string[],
    category: '',
    background: '',
    days_per_week: 3,
    duration_hours: 1.5,
    budget_min: 3000,
    budget_max: 8000,
    teaching_mode: 'in_person',
    preferred_tutor_gender: 'any',
    student_gender: 'any',
    special_requirements: [] as string[],
    preferred_time: '',
    number_of_students: 1,
    student_age: '',
    start_date: '',
    location_details: '',
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

    const [districtsRes, subjectsRes, profileRes, jobsRes, areasRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
      supabase.from('profiles').select('full_name, avatar_url, phone, email, district_id, area_id, user_reference').eq('id', user.id).single(),
      supabase.from('jobs')
        .select('*, districts (name_en, name_bn), subjects (name_en, name_bn), job_subjects (subjects (name_en, name_bn))')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('areas').select('*').order('name_en'),
    ]);

    if (districtsRes.data) setDistricts(districtsRes.data);
    if (areasRes.data) setAreas(areasRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (profileRes.data) setUserProfile(profileRes.data as UserProfileFull);
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);

    const { data: bookingsData } = await supabase
      .from('demo_bookings')
      .select('*, subjects(name_en, name_bn), tutor_profiles:tutor_id(id, profiles:user_id(full_name, avatar_url))')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (bookingsData) setDemoBookings(bookingsData);

    const { data: txnData } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txnData) setTransactions(txnData);

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
    const { data: jobData, error } = await supabase.from('jobs').insert({
      parent_id: user.id,
      title: jobForm.title,
      description: jobForm.description,
      subject_id: jobForm.subject_ids.length > 0 ? jobForm.subject_ids[0] : null,
      district_id: jobForm.district_id,
      area_id: jobForm.area_id || null,
      class_level: jobForm.class_levels.length > 0 ? jobForm.class_levels.join(', ') : null,
      days_per_week: jobForm.days_per_week,
      duration_hours: jobForm.duration_hours,
      budget_min: jobForm.budget_min,
      budget_max: jobForm.budget_max,
      teaching_mode: jobForm.teaching_mode as 'online' | 'in_person' | 'hybrid',
      preferred_tutor_gender: jobForm.preferred_tutor_gender as 'male' | 'female' | 'any',
      student_gender: jobForm.student_gender as 'male' | 'female' | 'any',
      special_requirements: jobForm.special_requirements.length > 0 ? jobForm.special_requirements.join(', ') : null,
      preferred_time: jobForm.preferred_time || null,
      number_of_students: jobForm.number_of_students,
      student_age: jobForm.student_age || null,
      start_date: jobForm.start_date || null,
      location_details: jobForm.location_details || null,
    }).select('id').single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (jobData) {
      // Insert job_subjects
      if (jobForm.subject_ids.length > 0) {
        await supabase.from('job_subjects').insert(
          jobForm.subject_ids.map(sid => ({ job_id: jobData.id, subject_id: sid }))
        );
      }
      toast({ title: 'Success!', description: 'Job posted successfully' });
      setShowPostJob(false);
      resetJobForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const resetJobForm = () => {
    setSelectedJobDivision('');
    setJobForm({
      title: '', description: '', subject_ids: [] as string[], district_id: '', area_id: '', class_levels: [] as string[],
      category: '', background: '',
      days_per_week: 3, duration_hours: 1.5, budget_min: 3000, budget_max: 8000,
      teaching_mode: 'in_person', preferred_tutor_gender: 'any', student_gender: 'any',
      special_requirements: [] as string[], preferred_time: '',
      number_of_students: 1, student_age: '', start_date: '', location_details: '',
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

  const startEditJob = async (job: Job) => {
    // Fetch subject IDs from job_subjects
    const { data: jsData } = await supabase.from('job_subjects').select('subject_id').eq('job_id', job.id);
    // Set division from district
    const district = districts.find(d => d.id === job.district_id);
    if (district) setSelectedJobDivision(district.division_en);
    setJobForm({
      title: job.title,
      description: job.description,
      subject_ids: jsData?.map(js => js.subject_id) || [],
      district_id: job.district_id,
      area_id: job.area_id || '',
      class_levels: job.class_level ? job.class_level.split(', ') : [],
      category: '',
      background: '',
      days_per_week: job.days_per_week || 3,
      duration_hours: job.duration_hours || 1.5,
      budget_min: job.budget_min || 3000,
      budget_max: job.budget_max || 8000,
      teaching_mode: job.teaching_mode || 'in_person',
      preferred_tutor_gender: job.preferred_tutor_gender || 'any',
      student_gender: job.student_gender || 'any',
      special_requirements: job.special_requirements ? job.special_requirements.split(', ') : [],
      preferred_time: job.preferred_time || '',
      number_of_students: job.number_of_students || 1,
      student_age: job.student_age || '',
      start_date: job.start_date || '',
      location_details: job.location_details || '',
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
      subject_id: jobForm.subject_ids.length > 0 ? jobForm.subject_ids[0] : null,
      district_id: jobForm.district_id,
      area_id: jobForm.area_id || null,
      class_level: jobForm.class_levels.length > 0 ? jobForm.class_levels.join(', ') : null,
      days_per_week: jobForm.days_per_week,
      duration_hours: jobForm.duration_hours,
      budget_min: jobForm.budget_min,
      budget_max: jobForm.budget_max,
      teaching_mode: jobForm.teaching_mode as 'online' | 'in_person' | 'hybrid',
      preferred_tutor_gender: jobForm.preferred_tutor_gender as 'male' | 'female' | 'any',
      student_gender: jobForm.student_gender as 'male' | 'female' | 'any',
      special_requirements: jobForm.special_requirements.length > 0 ? jobForm.special_requirements.join(', ') : null,
      preferred_time: jobForm.preferred_time || null,
      number_of_students: jobForm.number_of_students,
      student_age: jobForm.student_age || null,
      start_date: jobForm.start_date || null,
      location_details: jobForm.location_details || null,
    }).eq('id', editingJob.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update job_subjects
      await supabase.from('job_subjects').delete().eq('job_id', editingJob.id);
      if (jobForm.subject_ids.length > 0) {
        await supabase.from('job_subjects').insert(
          jobForm.subject_ids.map(sid => ({ job_id: editingJob.id, subject_id: sid }))
        );
      }
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

  const handleInviteToInterview = (app: Application) => {
    setInterviewApp(app);
    setInterviewDate(undefined);
    setInterviewTime('');
    setInterviewNotes('');
    setInterviewDialogOpen(true);
  };

  const handleScheduleInterview = async () => {
    if (!selectedJob || !interviewApp?.tutor_profiles?.user_id || !interviewDate || !interviewTime) {
      toast({ title: 'Missing info', description: 'Please select a date and time', variant: 'destructive' });
      return;
    }
    setSchedulingInterview(true);
    const formattedDate = format(interviewDate, 'yyyy-MM-dd');

    // Create a demo booking for the interview
    const { error: bookingError } = await supabase.from('demo_bookings').insert({
      parent_id: user!.id,
      tutor_id: interviewApp.tutor_profiles.id,
      preferred_date: formattedDate,
      preferred_time: interviewTime,
      notes: interviewNotes || null,
      class_fee: 0,
      status: 'pending',
      subject_id: selectedJob.subject_ids?.[0] || null,
    });

    // Notify the tutor
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: interviewApp.tutor_profiles.user_id,
      title: 'Interview/Demo Class Invitation',
      message: `You have been invited for a demo class for "${selectedJob.title}" on ${format(interviewDate, 'PPP')} at ${interviewTime}.${interviewNotes ? ' Notes: ' + interviewNotes : ''}`,
      type: 'interview_invite',
      reference_id: selectedJob.id,
    });

    if (bookingError || notifError) {
      toast({ title: 'Error', description: (bookingError || notifError)?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Interview Scheduled!', description: `Demo class scheduled for ${format(interviewDate, 'PPP')} at ${interviewTime}` });
      setInterviewDialogOpen(false);
      setInterviewApp(null);
    }
    setSchedulingInterview(false);
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

  const jobDivisions = useMemo(() => {
    const divSet = new Map<string, string>();
    districts.forEach(d => {
      if (!divSet.has(d.division_en)) divSet.set(d.division_en, d.division_bn);
    });
    return Array.from(divSet.entries()).map(([en, bn]) => ({ en, bn })).sort((a, b) => a.en.localeCompare(b.en));
  }, [districts]);

  const districtOptions = useMemo(() => {
    const filtered = selectedJobDivision ? districts.filter(d => d.division_en === selectedJobDivision) : districts;
    return filtered.map(d => ({
      value: d.id,
      label: d.name_en,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [districts, selectedJobDivision]);

  const subjectOptions = useMemo(() => subjects.map(s => ({
    value: s.id,
    label: s.name_en,
  })), [subjects]);

  const areaOptions = useMemo(() => {
    const filtered = jobForm.district_id ? areas.filter(a => a.district_id === jobForm.district_id) : areas;
    return filtered.map(a => ({
      value: a.id,
      label: a.name_en,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [areas, jobForm.district_id]);

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

  const pendingApprovalJobs = jobs.filter(j => j.status === 'pending_approval');
  const openJobs = jobs.filter(j => j.status === 'open');
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const pausedJobs = jobs.filter(j => j.status === 'cancelled');
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.total_applications || 0), 0);
  const profileInfo = getProfileCompleteness();

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
      case 'pending_approval': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Active';
      case 'in_progress': return 'Hired';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Paused';
      case 'pending_approval': return 'Pending Approval';
      default: return status;
    }
  };

  // ─── Section title for header ───
  const sectionTitle = sectionItems.find(s => s.key === activeSection)?.title || 'Dashboard';

  // ─── Post Job Dialog (shared) ───
  const postJobDialog = (
    <Dialog open={showPostJob} onOpenChange={(open) => {
      setShowPostJob(open);
      if (!open) { setEditingJob(null); resetJobForm(); }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingJob ? 'Edit Tuition Job' : 'Post a Tuition Job'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={editingJob ? handleUpdateJob : handlePostJob} className="space-y-5 mt-4">
          {/* Section: Basic Info */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</p>
            <div className="h-px bg-border" />
          </div>
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
              placeholder="Describe your requirements, schedule preferences, learning goals, etc."
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              required
              rows={4}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={jobForm.category} onValueChange={(v) => setJobForm({ ...jobForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Background</Label>
              <Select value={jobForm.background} onValueChange={(v) => setJobForm({ ...jobForm, background: v })}>
                <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
                <SelectContent>
                  {STUDENT_BACKGROUNDS.map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Subjects *</Label>
              <MultiSearchableSelect
                options={subjectOptions}
                values={jobForm.subject_ids}
                onValuesChange={(v) => setJobForm({ ...jobForm, subject_ids: v })}
                placeholder="Select subjects..."
                searchPlaceholder="Type to search subjects..."
                emptyText="No subjects found."
              />
            </div>
            <div>
              <Label>Class Level(s)</Label>
              <MultiSearchableSelect
                options={classLevelOptions}
                values={jobForm.class_levels}
                onValuesChange={(v) => setJobForm({ ...jobForm, class_levels: v })}
                placeholder="Select class levels..."
                searchPlaceholder="Type to search..."
                emptyText="No class levels found."
                grouped
              />
            </div>
          </div>

          {/* Section: Student Details */}
          <div className="space-y-1 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Details</p>
            <div className="h-px bg-border" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Number of Students</Label>
              <Select value={String(jobForm.number_of_students)} onValueChange={(v) => setJobForm({ ...jobForm, number_of_students: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} student{n > 1 ? 's' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student Age (Optional)</Label>
              <Input
                placeholder="e.g., 12 years"
                value={jobForm.student_age}
                onChange={(e) => setJobForm({ ...jobForm, student_age: e.target.value })}
              />
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

          {/* Section: Schedule & Budget */}
          <div className="space-y-1 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule & Budget</p>
            <div className="h-px bg-border" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
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
            <div>
              <Label>Duration per Session</Label>
              <Select value={String(jobForm.duration_hours)} onValueChange={(v) => setJobForm({ ...jobForm, duration_hours: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">30 minutes</SelectItem>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="1.5">1.5 hours</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="2.5">2.5 hours</SelectItem>
                  <SelectItem value="3">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Time</Label>
              <Input
                type="time"
                value={jobForm.preferred_time}
                onChange={(e) => setJobForm({ ...jobForm, preferred_time: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
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
            <div>
              <Label>Start Date (Optional)</Label>
              <Input
                type="date"
                value={jobForm.start_date}
                onChange={(e) => setJobForm({ ...jobForm, start_date: e.target.value })}
              />
            </div>
          </div>

          {/* Section: Location & Teaching */}
          <div className="space-y-1 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location & Teaching Preferences</p>
            <div className="h-px bg-border" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Division *</Label>
              <Select value={selectedJobDivision} onValueChange={(v) => { setSelectedJobDivision(v); setJobForm({ ...jobForm, district_id: '', area_id: '' }); }}>
                <SelectTrigger><SelectValue placeholder="Select Division" /></SelectTrigger>
                <SelectContent>
                  {jobDivisions.map(div => (
                    <SelectItem key={div.en} value={div.en}>{div.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>District *</Label>
              <SearchableSelect
                options={districtOptions}
                value={jobForm.district_id}
                onValueChange={(v) => setJobForm({ ...jobForm, district_id: v, area_id: '' })}
                placeholder={selectedJobDivision ? "Search district..." : "Select division first"}
                searchPlaceholder="Type to search districts..."
                emptyText="No districts found."
              />
            </div>
            <div>
              <Label>Thana/Upazila (Optional)</Label>
              <SearchableSelect
                options={areaOptions}
                value={jobForm.area_id}
                onValueChange={(v) => setJobForm({ ...jobForm, area_id: v })}
                placeholder={jobForm.district_id ? "Search thana/upazila..." : "Select district first"}
                searchPlaceholder="Type to search areas..."
                emptyText="No areas found."
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
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
          </div>
          {jobForm.teaching_mode !== 'online' && (
            <div>
              <Label>Location Details (Optional)</Label>
              <Input
                placeholder="e.g., House 12, Road 5, Dhanmondi, Dhaka"
                value={jobForm.location_details}
                onChange={(e) => setJobForm({ ...jobForm, location_details: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Specific address for in-person tutoring (shared only with selected tutor)</p>
            </div>
          )}

          {/* Section: Special Requirements */}
          <div className="space-y-1 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Requirements (Optional)</p>
            <div className="h-px bg-border" />
          </div>
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

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (editingJob ? 'Updating...' : 'Posting...') : (editingJob ? 'Update Job' : 'Post Job')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  // ─── Report Dialog (shared) ───
  const reportDialog = (
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
  );

  // ─── Interview Scheduling Dialog ───
  const interviewDialog = (
    <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Interview / Demo Class
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {interviewApp && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={interviewApp.tutor_profiles?.profiles?.avatar_url} />
                <AvatarFallback>{interviewApp.tutor_profiles?.profiles?.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{interviewApp.tutor_profiles?.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">For: {selectedJob?.title}</p>
              </div>
            </div>
          )}
          <div>
            <Label className="mb-2 block">Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !interviewDate && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {interviewDate ? format(interviewDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={interviewDate}
                  onSelect={setInterviewDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="mb-2 block">Select Time</Label>
            <Select value={interviewTime} onValueChange={setInterviewTime}>
              <SelectTrigger><SelectValue placeholder="Choose a time slot" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="8:00 AM">8:00 AM</SelectItem>
                <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                <SelectItem value="8:00 PM">8:00 PM</SelectItem>
                <SelectItem value="9:00 PM">9:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Notes (optional)</Label>
            <Textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="Any specific topics to cover, location details, etc."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setInterviewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleScheduleInterview} disabled={schedulingInterview || !interviewDate || !interviewTime}>
            <Send className="h-4 w-4 mr-2" />
            {schedulingInterview ? 'Scheduling...' : 'Schedule & Notify Tutor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Render section content ───
  const renderOverview = () => (
    <>
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
                  {boostCandidates.length} job{boostCandidates.length > 1 ? 's have' : ' has'} been live for 24+ hours with no applicants.
                </p>
                <div className="flex flex-wrap gap-2">
                  {boostCandidates.map(job => (
                    <Button key={job.id} size="sm" variant="outline" onClick={() => startEditJob(job)}>
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
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('jobs')}>
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

    </>
  );

  const renderJobs = () => (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Tuition Jobs
            </CardTitle>
            <Button size="sm" onClick={() => setShowPostJob(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Post Job
            </Button>
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
                              {job.districts?.name_en}
                            </span>
                            {job.subjects && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {job.subjects.name_en}
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
                          <div className="flex gap-1">
                            {(job.status === 'open' || job.status === 'cancelled') && (
                              <Button size="icon" variant="ghost" title="Edit" onClick={(e) => { e.stopPropagation(); startEditJob(job); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {job.status === 'open' && (
                              <Button size="icon" variant="ghost" title="Pause Job" onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'cancelled'); }}>
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            {job.status === 'cancelled' && (
                              <Button size="icon" variant="ghost" title="Reactivate Job" className="text-success" onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'open'); }}>
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {job.status === 'in_progress' && (
                              <Button size="icon" variant="ghost" title="Mark Completed" className="text-success" onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'completed'); }}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {(job.status === 'open' || job.status === 'cancelled') && (
                              <Button size="icon" variant="ghost" className="text-destructive" title="Delete" onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }}>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3 px-2 font-medium text-muted-foreground">Photo</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Name</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Date of Apply</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Proposed</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => {
                      const tutor = app.tutor_profiles;
                      return (
                        <tr key={app.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-2">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={tutor?.profiles?.avatar_url} />
                              <AvatarFallback>{tutor?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                            </Avatar>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col">
                              <span className="font-semibold">{tutor?.profiles?.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {tutor?.experience_years || 0} yrs exp · ⭐ {tutor?.average_rating || 0}
                                {tutor?.verification_status === 'approved' && ' · ✓ Verified'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                            {format(new Date(app.created_at), 'dd MMM yyyy')}
                          </td>
                          <td className="py-3 px-2 font-medium whitespace-nowrap">
                            ৳{app.proposed_rate}/mo
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={
                              app.status === 'accepted' ? 'bg-success' :
                              app.status === 'rejected' ? 'bg-destructive' :
                              'bg-warning text-warning-foreground'
                            }>
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1 justify-center flex-wrap">
                              {app.status === 'pending' && (
                                <>
                                  <Button size="sm" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'accepted')}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Hire
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => handleInviteToInterview(app)}>
                                    <Send className="h-3.5 w-3.5 mr-1" />
                                    Invite
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'rejected')}>
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {app.status === 'accepted' && (
                                <Badge className="bg-success/10 text-success border-success/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Hired
                                </Badge>
                              )}
                              {app.status === 'rejected' && (
                                <span className="text-xs text-muted-foreground">Rejected</span>
                              )}
                              <Link to={`/tutor/${tutor?.id}`}>
                                <Button size="sm" variant="ghost" className="h-8 text-xs">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive"
                                onClick={() => {
                                  setReportTargetApp(app);
                                  setReportDialogOpen(true);
                                }}
                              >
                                <Flag className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
    </>
  );

  const renderDemoBookings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          My Demo Class Bookings
        </CardTitle>
        <CardDescription>Track your trial lesson requests</CardDescription>
      </CardHeader>
      <CardContent>
        {demoBookings.length > 0 ? (
          <div className="space-y-4">
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
                          {booking.subjects.name_en}
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
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold mb-2">No demo bookings yet</h3>
            <p className="text-muted-foreground">Book a demo class with a tutor to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPayments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>Transaction history, demo class fees, and subscription status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscription Status */}
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Subscription Status
          </h4>
          {subscription ? (
            <div className="p-4 border rounded-xl bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{subscription.subscription_plans?.name || 'Active Plan'}</p>
                  <p className="text-sm text-muted-foreground">
                    ৳{subscription.subscription_plans?.price_monthly}/month
                  </p>
                </div>
                <Badge className="bg-success">Active</Badge>
              </div>
              {subscription.current_period_end && (
                <p className="text-xs text-muted-foreground mt-2">
                  Renews on {format(new Date(subscription.current_period_end), 'dd MMM yyyy')}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 border rounded-xl text-center">
              <p className="text-muted-foreground text-sm">No active subscription</p>
              <Link to="/pricing">
                <Button size="sm" variant="outline" className="mt-2">View Plans</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Demo Class Fees Summary */}
        {demoBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Demo Class Fees
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xl font-bold text-primary">
                  ৳{demoBookings.reduce((sum: number, b: any) => sum + (b.class_fee || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Fees</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xl font-bold text-success">
                  {demoBookings.filter((b: any) => b.status === 'completed').length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xl font-bold text-warning">
                  {demoBookings.filter((b: any) => b.status === 'pending' || b.status === 'confirmed').length}
                </p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Transaction History
          </h4>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {txn.listing_type === 'verification_badge' ? 'Verified Badge' :
                         txn.listing_type ? `Featured: ${txn.listing_type}` :
                         txn.plan_id ? 'Subscription' : 'Payment'}
                      </p>
                      <Badge variant="outline" className="text-xs font-mono">{txn.transaction_id.slice(0, 15)}...</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(txn.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold">৳{txn.amount}</p>
                    <Badge className={
                      txn.status === 'completed' ? 'bg-success' :
                      txn.status === 'pending' ? 'bg-warning text-warning-foreground' :
                      'bg-destructive'
                    }>
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg">
              <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderProfile = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          My Profile
        </CardTitle>
        <CardDescription>Manage your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={userProfile?.avatar_url || ''} />
            <AvatarFallback className="text-2xl">{userProfile?.full_name?.charAt(0) || 'P'}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">{userProfile?.full_name || 'Parent'}</h3>
            <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
            {userProfile?.phone && <p className="text-sm text-muted-foreground">{userProfile.phone}</p>}
            {userProfile?.user_reference && (
              <Badge variant="outline" className="font-mono text-xs mt-1">{userProfile.user_reference}</Badge>
            )}
          </div>
        </div>

        <Progress value={profileInfo.percent} className="h-2 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">{profileInfo.percent}% complete</p>

        {profileInfo.missing.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profileInfo.missing.map((item) => (
              <Badge key={item} variant="outline" className="text-warning border-warning/50">
                Missing: {item}
              </Badge>
            ))}
          </div>
        )}

        <Link to="/parent/profile">
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'jobs': return renderJobs();
      case 'demo': return renderDemoBookings();
      case 'payments': return renderPayments();
      case 'profile': return renderProfile();
      default: return renderOverview();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ParentSidebar activeSection={activeSection} setActiveSection={setActiveSection} onPostJob={() => setShowPostJob(true)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-lg font-bold hidden sm:inline">{sectionTitle}</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {renderActiveSection()}
          </main>
        </div>
      </div>

      {postJobDialog}
      {reportDialog}
      {interviewDialog}
    </SidebarProvider>
  );
}
