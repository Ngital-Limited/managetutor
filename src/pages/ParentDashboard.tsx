import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
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
import { getPlatformCommissionPct, computeFeeSplit } from '@/lib/commission';
import { differenceInHours, format } from 'date-fns';
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
import { ParentBottomNav } from '@/components/ParentBottomNav';
import { NotificationBell } from '@/components/NotificationBell';
import {
  GraduationCap, LogOut, Globe, Plus, MapPin, BookOpen,
  Star, Briefcase, Users, Clock, CheckCircle2, XCircle, Search, ArrowRight,
  Eye, Edit, Trash2, Calendar, Home, Heart, AlertCircle,
  User, CreditCard, Pause, Play, Flag, Zap,
  Send, AlertTriangle, Receipt, DollarSign, LayoutDashboard, X,
  LifeBuoy, Settings, Phone
} from 'lucide-react';
import { ParentHelpSupport } from '@/components/parent/ParentHelpSupport';
import { ParentSettings } from '@/components/parent/ParentSettings';

interface District { id: string; name_en: string; division_en: string; }
interface Subject { id: string; name_en: string; }
interface Area { id: string; name_en: string; district_id: string; }

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
  districts: { name_en: string};
  subjects: { name_en: string} | null;
  job_subjects?: { subjects: { name_en: string} }[];
  is_featured?: boolean;
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
    // rating fields removed
    total_students: number;
    verification_status: string;
    verification_paid: boolean;
    teaching_mode: string;
    gender: string;
    monthly_salary_min: number | null;
    monthly_salary_max: number | null;
    is_available: boolean;
    district_id: string | null;
    districts: { name_en: string} | null;
    profiles: { full_name: string; avatar_url: string };
    tutor_subjects: { subjects: { name_en: string} }[];
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

type SectionKey = 'overview' | 'jobs' | 'applicants' | 'demo' | 'tuitions' | 'payments' | 'profile' | 'help' | 'settings';

const sectionItems: { key: SectionKey; title: string; icon: any }[] = [
  { key: 'overview', title: 'Overview', icon: LayoutDashboard },
  { key: 'jobs', title: 'My Jobs', icon: Briefcase },
  { key: 'applicants', title: 'All Applicants', icon: Users },
  { key: 'tuitions', title: 'Active Tuitions', icon: GraduationCap },
  { key: 'demo', title: 'Demo Classes', icon: Calendar },
  { key: 'payments', title: 'Payments', icon: CreditCard },
  { key: 'profile', title: 'My Profile', icon: User },
  { key: 'help', title: 'Help & Support', icon: LifeBuoy },
  { key: 'settings', title: 'Settings', icon: Settings },
];

const externalLinks = [
  { title: 'Browse Tutors', url: '/tutors', icon: Search },
  { title: 'My Favorites', url: '/favorites', icon: Heart },
  { title: 'Pricing', url: '/pricing', icon: CreditCard },
];

function ParentSidebar({ activeSection, setActiveSection, onPostJob, pendingApplicants, onApplicantsClick }: { activeSection: SectionKey; setActiveSection: (s: SectionKey) => void; onPostJob: () => void; pendingApplicants: number; onApplicantsClick?: () => void }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, user } = useAuth();
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {!collapsed && (
              <Logo size="sm" />
            )}
            {isMobile && (
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
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
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3">Main</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => { onPostJob(); closeOnMobile(); }}
                  className="cursor-pointer hover:bg-primary/10 text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Post New Job</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {sectionItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => {
                      setActiveSection(item.key);
                      if (item.key === 'applicants' && pendingApplicants > 0) {
                        onApplicantsClick?.();
                      }
                      closeOnMobile();
                    }}
                    className={`cursor-pointer ${activeSection === item.key ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'}`}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {!collapsed && <span className="flex-1 text-left truncate">{item.title}</span>}
                    {!collapsed && item.key === 'applicants' && pendingApplicants > 0 && (
                      <span className="ml-auto text-[10px] font-medium bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">{pendingApplicants}</span>
                    )}
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
                    <Link to={item.url} className="hover:bg-muted/50" onClick={closeOnMobile}>
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
  const [jobBoosts, setJobBoosts] = useState<Record<string, { end_date: string; is_active: boolean }>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allApplicants, setAllApplicants] = useState<(Application & { jobs: { id: string; title: string; job_reference: string } })[]>([]);
  const [applicantsStatusFilter, setApplicantsStatusFilter] = useState<'all' | 'pending' | 'shortlisted' | 'invited_to_demo' | 'accepted' | 'rejected' | 'contact_requested' | 'contact_released'>('all');
  const [loading, setLoading] = useState(true);
  const [demoBookings, setDemoBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [showPostJob, setShowPostJob] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
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
  const [interviewFee, setInterviewFee] = useState('0');
  const [interviewCommissionPct, setInterviewCommissionPct] = useState(20);
  const [schedulingInterview, setSchedulingInterview] = useState(false);

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
    fixed_time: '',
    number_of_students: 1,
    student_age: '',
    student_school_name: '',
    start_date: '',
    location_details: '',
  });

  const [userProfile, setUserProfile] = useState<UserProfileFull | null>(null);
  const [featuredJobPrice, setFeaturedJobPrice] = useState<number>(300);
  const [boostingJobId, setBoostingJobId] = useState<string | null>(null);

  // Student profiles state
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentForm, setStudentForm] = useState({ name: '', age: '', class_level: '', school_name: '', medium: '', learning_needs: '' });

  // Hiring confirmation state
  const [hiringDialogOpen, setHiringDialogOpen] = useState(false);
  const [hiringApp, setHiringApp] = useState<Application | null>(null);
  const [hiringForm, setHiringForm] = useState({ agreed_salary: '', start_date: '', subjects: '', days_per_week: '3' });
  const [hiringConfirmations, setHiringConfirmations] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'featured_job_price').maybeSingle()
      .then(({ data }) => {
        const n = Number(data?.value);
        if (Number.isFinite(n) && n >= 0) setFeaturedJobPrice(n);
      });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  // Realtime: refresh applicants when applications change for this parent's jobs
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('parent-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [districtsRes, subjectsRes, profileRes, jobsRes, areasRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
      supabase.from('profiles').select('full_name, avatar_url, phone, email, district_id, area_id, user_reference').eq('id', user.id).single(),
      supabase.from('jobs')
        .select('*, districts (name_en), subjects (name_en), job_subjects (subjects (name_en))')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('areas').select('*').order('name_en'),
    ]);

    if (districtsRes.data) setDistricts(districtsRes.data);
    if (areasRes.data) setAreas(areasRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (profileRes.data) setUserProfile(profileRes.data as UserProfileFull);
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);

    // Fetch most recent featured listing per job (active or expired) so we can show status + offer "Boost again"
    const allJobIds = (jobsRes.data || []).map((j: any) => j.id);
    if (allJobIds.length > 0) {
      const { data: listings } = await supabase
        .from('featured_listings')
        .select('job_id, end_date, is_active, start_date')
        .eq('listing_type', 'job_post')
        .in('job_id', allJobIds)
        .order('end_date', { ascending: false });
      const map: Record<string, { end_date: string; is_active: boolean }> = {};
      (listings || []).forEach((l: any) => {
        if (l.job_id && !map[l.job_id]) {
          map[l.job_id] = { end_date: l.end_date, is_active: !!l.is_active };
        }
      });
      setJobBoosts(map);
    } else {
      setJobBoosts({});
    }

    const { data: bookingsData } = await supabase
      .from('demo_bookings')
      .select('*, subjects(name_en), tutor_profiles:tutor_id(id, profiles:user_id(full_name, avatar_url))')
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

    // Fetch all applicants across this parent's jobs
    const jobIds = (jobsRes.data || []).map((j: any) => j.id);
    if (jobIds.length > 0) {
      const { data: allAppsData } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner (id, title, job_reference, parent_id),
          tutor_profiles (
            id, user_id, bio, education, education_detail, experience_years,
            total_students, verification_status, verification_paid,
            teaching_mode, gender, monthly_salary_min, monthly_salary_max, is_available,
            district_id, districts (name_en),
            profiles:user_id (full_name, avatar_url),
            tutor_subjects (subjects (name_en))
          )
        `)
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      if (allAppsData) setAllApplicants(allAppsData as any);
    } else {
      setAllApplicants([]);
    }

    // Fetch student profiles
    const { data: studentsData } = await (supabase as any)
      .from('student_profiles')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });
    if (studentsData) setStudentProfiles(studentsData);

    // Fetch hiring confirmations
    const { data: hcData } = await (supabase as any)
      .from('hiring_confirmations')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });
    if (hcData) setHiringConfirmations(hcData);

    setLoading(false);
  };

  const fetchApplications = async (jobId: string) => {
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        tutor_profiles (
          id, user_id, bio, education, education_detail, experience_years, 
          total_students, verification_status, verification_paid,
          teaching_mode, gender, monthly_salary_min, monthly_salary_max, is_available,
          district_id, districts (name_en),
          profiles:user_id (full_name, avatar_url),
          tutor_subjects (subjects (name_en))
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (data) setApplications(data as unknown as Application[]);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!jobForm.student_school_name.trim()) {
      toast({ title: 'Required', description: 'Student School Name is required.', variant: 'destructive' });
      return;
    }

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
      fixed_time: jobForm.fixed_time || null,
      number_of_students: jobForm.number_of_students,
      student_age: jobForm.student_age || null,
      start_date: jobForm.start_date || null,
      location_details: jobForm.location_details || null,
      student_school_name: jobForm.student_school_name || null,
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
    setPrefilled(false);
    setJobForm({
      title: '', description: '', subject_ids: [] as string[], district_id: '', area_id: '', class_levels: [] as string[],
      category: '', background: '',
      days_per_week: 3, duration_hours: 1.5, budget_min: 3000, budget_max: 8000,
      teaching_mode: 'in_person', preferred_tutor_gender: 'any', student_gender: 'any',
      special_requirements: [] as string[], preferred_time: '', fixed_time: '',
      number_of_students: 1, student_age: '', student_school_name: '', start_date: '', location_details: '',
    });
  };

  const prefillFromLastJob = async () => {
    if (!user) return;
    const { data: lastJob } = await supabase.from('jobs')
      .select('district_id, area_id, location_details, student_school_name, student_age, student_gender, number_of_students, teaching_mode, preferred_tutor_gender, days_per_week, duration_hours, budget_min, budget_max, preferred_time, special_requirements, class_level')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastJob) {
      setJobForm(prev => ({
        ...prev,
        district_id: lastJob.district_id || '',
        area_id: lastJob.area_id || '',
        location_details: lastJob.location_details || '',
        student_school_name: lastJob.student_school_name || '',
        student_age: lastJob.student_age || '',
        student_gender: lastJob.student_gender || 'any',
        number_of_students: lastJob.number_of_students || 1,
        teaching_mode: lastJob.teaching_mode || 'in_person',
        preferred_tutor_gender: lastJob.preferred_tutor_gender || 'any',
        days_per_week: lastJob.days_per_week || 3,
        duration_hours: lastJob.duration_hours ? Number(lastJob.duration_hours) : 1.5,
        budget_min: lastJob.budget_min || 3000,
        budget_max: lastJob.budget_max || 8000,
        preferred_time: lastJob.preferred_time || '',
        special_requirements: lastJob.special_requirements ? lastJob.special_requirements.split(', ') : [],
        class_levels: lastJob.class_level ? lastJob.class_level.split(', ') : [],
      }));
      setPrefilled(true);
    }
  };

  const notifyAppliedTutors = async (jobId: string, title: string, message: string, type: string) => {
    const { data: apps } = await supabase
      .from('applications')
      .select('tutor_id, tutor_profiles!inner (user_id)')
      .eq('job_id', jobId);
    if (!apps || apps.length === 0) return;
    const userIds = Array.from(new Set(apps.map((a: any) => a.tutor_profiles?.user_id).filter(Boolean)));
    if (userIds.length === 0) return;
    await supabase.from('notifications').insert(
      userIds.map((uid) => ({ user_id: uid, title, message, type, reference_id: jobId }))
    );
  };

  const handleBoostJob = async (job: Job) => {
    if (!user || !userProfile) return;
    if (job.is_featured) {
      toast({ title: 'Already boosted', description: 'This job is already featured.' });
      return;
    }
    setBoostingJobId(job.id);
    try {
      const { data, error } = await supabase.functions.invoke('sslcommerz-init', {
        body: {
          amount: featuredJobPrice,
          productName: `Featured Job: ${job.title}`,
          productCategory: 'Featured Listing',
          customerName: userProfile.full_name,
          customerEmail: user.email,
          customerPhone: userProfile.phone || '01700000000',
          userId: user.id,
          listingType: 'job_post',
          jobId: job.id,
        },
      });
      if (error) throw error;
      if (data?.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        throw new Error('No gateway URL returned');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBoostingJobId(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const jobTitle = job?.title || 'a job you applied to';
    // Notify applied tutors BEFORE deletion (applications row will be removed)
    await notifyAppliedTutors(
      jobId,
      'Job removed',
      `The guardian deleted the job "${jobTitle}". Your application has been withdrawn.`,
      'job_deleted'
    );
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
      if (status === 'cancelled') {
        const job = jobs.find(j => j.id === jobId);
        const jobTitle = job?.title || 'a job you applied to';
        await notifyAppliedTutors(
          jobId,
          'Job paused by guardian',
          `The guardian paused the job "${jobTitle}". You'll be notified if it reopens.`,
          'job_paused'
        );
      }
      toast({ title: 'Updated', description: labels[status] || 'Job status updated' });
      fetchData();
    }
  };

  const startEditJob = async (job: Job) => {
    // Fetch subject IDs from job_subjects
    const { data: jsData } = await supabase.from('job_subjects').select('subject_id').eq('job_id', job.id);
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
      fixed_time: (job as any).fixed_time || '',
      number_of_students: job.number_of_students || 1,
      student_age: job.student_age || '',
      student_school_name: (job as any).student_school_name || '',
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
    // If the job was previously approved (open or in_progress), send it back for admin re-review
    const needsReReview = editingJob.status === 'open' || editingJob.status === 'in_progress';
    const updatePayload: any = {
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
      fixed_time: jobForm.fixed_time || null,
      number_of_students: jobForm.number_of_students,
      student_age: jobForm.student_age || null,
      start_date: jobForm.start_date || null,
      location_details: jobForm.location_details || null,
      student_school_name: jobForm.student_school_name || null,
    };
    if (needsReReview) updatePayload.status = 'pending_approval';

    const { error } = await supabase.from('jobs').update(updatePayload).eq('id', editingJob.id);

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
      toast({
        title: 'Updated!',
        description: needsReReview
          ? 'Job updated and resubmitted for admin approval.'
          : 'Job updated successfully',
      });
      setShowPostJob(false);
      setEditingJob(null);
      resetJobForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const handleApplicationAction = async (appId: string, status: 'accepted' | 'rejected' | 'shortlisted' | 'contact_requested' | 'contact_released') => {
    const { error } = await supabase.from('applications').update({ status: status as any }).eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    const inlineApp = applications.find(a => a.id === appId);
    const allApp = allApplicants.find((a: any) => a.id === appId);
    const tutorUserId = inlineApp?.tutor_profiles?.user_id || (allApp as any)?.tutor_profiles?.user_id;
    const jobTitle = selectedJob?.title || (allApp as any)?.jobs?.title || '';
    const jobId = selectedJob?.id || (allApp as any)?.jobs?.id;

    toast({ title: 'Updated', description: `Application ${status.replace('_', ' ')}.` });

    if (status === 'accepted' && jobId) {
      await supabase.from('jobs').update({ status: 'in_progress' as any }).eq('id', jobId);
      if (tutorUserId) {
        await supabase.from('notifications').insert({
          user_id: tutorUserId,
          title: 'You have been hired!',
          message: `Congratulations! You have been selected for "${jobTitle}".`,
          type: 'hired',
          reference_id: jobId,
        });
      }
    } else if (status === 'shortlisted' && tutorUserId) {
      await supabase.from('notifications').insert({
        user_id: tutorUserId,
        title: 'You have been shortlisted!',
        message: `Great news — you've been shortlisted for "${jobTitle}". The guardian may invite you for a demo class soon.`,
        type: 'application_shortlisted',
        reference_id: jobId,
      });
    } else if (status === 'contact_requested' && tutorUserId) {
      // Notify admin that parent wants tutor contact info
      await supabase.from('notifications').insert({
        user_id: tutorUserId,
        title: 'Contact info requested',
        message: `A guardian has requested your contact details for "${jobTitle}". Admin will review and release shortly.`,
        type: 'contact_requested',
        reference_id: jobId,
      });
    } else if (status === 'rejected' && tutorUserId) {
      await supabase.from('notifications').insert({
        user_id: tutorUserId,
        title: 'Application not selected',
        message: `Your application for "${jobTitle}" was not selected this time.`,
        type: 'application_rejected',
        reference_id: jobId,
      });
    }

    fetchData();
    if (selectedJob) fetchApplications(selectedJob.id);
  };

  // Mark the result of a demo class (parent-reported)
  const handleDemoResult = async (booking: any, result: 'confirmed' | 'cancelled', reason?: string) => {
    if (result === 'confirmed') {
      // Mark booking as completed and hire the tutor
      const { error } = await supabase.from('demo_bookings').update({ status: 'completed' }).eq('id', booking.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

      // If this demo was linked to an application, accept it
      if (booking.application_id) {
        await supabase.from('applications').update({ status: 'accepted' as any }).eq('id', booking.application_id);
        const { data: app } = await supabase.from('applications').select('job_id').eq('id', booking.application_id).maybeSingle();
        if (app?.job_id) {
          await supabase.from('jobs').update({ status: 'in_progress' as any }).eq('id', app.job_id);
        }
      }

      // Notify tutor
      const { data: tp } = await supabase.from('tutor_profiles_public').select('user_id').eq('id', booking.tutor_id).maybeSingle();
      if (tp?.user_id) {
        await supabase.from('notifications').insert({
          user_id: tp.user_id,
          title: 'Demo confirmed — You have been hired!',
          message: 'The guardian confirmed the demo class result. Congratulations!',
          type: 'demo_result_confirmed',
          reference_id: booking.id,
        });
      }
      toast({ title: 'Demo confirmed', description: 'The tutor has been hired.' });
    } else {
      const { error } = await supabase.from('demo_bookings').update({
        status: 'cancelled',
        cancellation_reason: reason || 'Cancelled by guardian after demo class',
      }).eq('id', booking.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

      const { data: tp } = await supabase.from('tutor_profiles_public').select('user_id').eq('id', booking.tutor_id).maybeSingle();
      if (tp?.user_id) {
        await supabase.from('notifications').insert({
          user_id: tp.user_id,
          title: 'Demo result: Cancelled',
          message: `The guardian did not proceed after the demo class.${reason ? ' Reason: ' + reason : ''}`,
          type: 'demo_result_cancelled',
          reference_id: booking.id,
        });
      }
      toast({ title: 'Demo cancelled', description: 'The tutor has been notified.' });
    }
    fetchData();
  };

  const handleInviteToInterview = (app: Application) => {
    setInterviewApp(app);
    setInterviewDate(undefined);
    setInterviewTime('');
    setInterviewNotes('');
    setInterviewFee('0');
    getPlatformCommissionPct().then(setInterviewCommissionPct);
    setInterviewDialogOpen(true);
  };

  const handleScheduleInterview = async () => {
    if (!selectedJob || !interviewApp?.tutor_profiles?.user_id || !interviewDate || !interviewTime) {
      toast({ title: 'Missing info', description: 'Please select a date and time', variant: 'destructive' });
      return;
    }
    setSchedulingInterview(true);
    const formattedDate = format(interviewDate, 'yyyy-MM-dd');

    const split = computeFeeSplit(Number(interviewFee) || 0, interviewCommissionPct);
    // Create a demo booking for the interview, linked to the application
    const { error: bookingError } = await supabase.from('demo_bookings').insert({
      parent_id: user!.id,
      tutor_id: interviewApp.tutor_profiles.id,
      preferred_date: formattedDate,
      preferred_time: interviewTime,
      notes: interviewNotes || null,
      class_fee: split.classFee,
      platform_commission: split.platformCommission,
      tutor_payout: split.tutorPayout,
      status: 'pending',
      subject_id: selectedJob.subject_ids?.[0] || null,
      application_id: interviewApp.id,
    } as any);

    // Mark the application as invited_to_demo
    if (!bookingError) {
      await supabase.from('applications').update({ status: 'invited_to_demo' as any }).eq('id', interviewApp.id);
    }

    // Notify the tutor
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: interviewApp.tutor_profiles.user_id,
      title: 'Demo Class Invitation',
      message: `You have been invited for a demo class for "${selectedJob.title}" on ${format(interviewDate, 'PPP')} at ${interviewTime}. Awaiting admin approval.${interviewNotes ? ' Notes: ' + interviewNotes : ''}`,
      type: 'demo_invite',
      reference_id: selectedJob.id,
    });

    if (bookingError || notifError) {
      toast({ title: 'Error', description: (bookingError || notifError)?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Demo Class Invite Sent', description: `Scheduled for ${format(interviewDate, 'PPP')} at ${interviewTime}. Pending admin approval.` });
      setInterviewDialogOpen(false);
      setInterviewApp(null);
      fetchData();
      if (selectedJob) fetchApplications(selectedJob.id);
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

  // ─── Student Profile CRUD ───
  const resetStudentForm = () => {
    setStudentForm({ name: '', age: '', class_level: '', school_name: '', medium: '', learning_needs: '' });
    setEditingStudent(null);
    setShowStudentForm(false);
  };

  const handleSaveStudent = async () => {
    if (!user || !studentForm.name.trim()) {
      toast({ title: 'Required', description: 'Student name is required.', variant: 'destructive' });
      return;
    }
    const payload = {
      parent_id: user.id,
      name: studentForm.name.trim(),
      age: studentForm.age ? Number(studentForm.age) : null,
      class_level: studentForm.class_level || null,
      school_name: studentForm.school_name || null,
      medium: studentForm.medium || null,
      learning_needs: studentForm.learning_needs || null,
    };
    if (editingStudent) {
      const { error } = await (supabase as any).from('student_profiles').update(payload).eq('id', editingStudent.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Updated', description: 'Student profile updated.' });
    } else {
      const { error } = await (supabase as any).from('student_profiles').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Added', description: 'Student profile added.' });
    }
    resetStudentForm();
    fetchData();
  };

  const deleteStudent = async (id: string) => {
    if (!confirm('Delete this student profile?')) return;
    await (supabase as any).from('student_profiles').delete().eq('id', id);
    toast({ title: 'Deleted', description: 'Student profile removed.' });
    fetchData();
  };

  const startEditStudent = (s: any) => {
    setStudentForm({ name: s.name, age: s.age?.toString() || '', class_level: s.class_level || '', school_name: s.school_name || '', medium: s.medium || '', learning_needs: s.learning_needs || '' });
    setEditingStudent(s);
    setShowStudentForm(true);
  };

  // ─── Hiring Confirmation Flow ───
  const openHiringDialog = (app: Application) => {
    const job = selectedJob || jobs.find(j => j.id === (app as any).job_id);
    const subjectNames = job?.job_subjects?.map((js: any) => js.subjects?.name_en).filter(Boolean).join(', ') || job?.subjects?.name_en || '';
    setHiringApp(app);
    setHiringForm({
      agreed_salary: app.proposed_rate?.toString() || '',
      start_date: '',
      subjects: subjectNames,
      days_per_week: job?.days_per_week?.toString() || '3',
    });
    setHiringDialogOpen(true);
  };

  const handleConfirmHiring = async () => {
    if (!user || !hiringApp) return;
    if (!hiringForm.agreed_salary || !hiringForm.start_date) {
      toast({ title: 'Required', description: 'Please fill in salary and start date.', variant: 'destructive' });
      return;
    }
    const tutor = hiringApp.tutor_profiles;
    const jobId = selectedJob?.id || (hiringApp as any).jobs?.id;

    const { error: hcError } = await (supabase as any).from('hiring_confirmations').insert({
      application_id: hiringApp.id,
      job_id: jobId,
      parent_id: user.id,
      tutor_id: tutor.id,
      agreed_salary: Number(hiringForm.agreed_salary),
      start_date: hiringForm.start_date,
      subjects: hiringForm.subjects || null,
      days_per_week: Number(hiringForm.days_per_week) || 3,
    });

    if (hcError) {
      toast({ title: 'Error', description: hcError.message, variant: 'destructive' });
      return;
    }

    await handleApplicationAction(hiringApp.id, 'accepted');

    if (tutor?.user_id) {
      await supabase.from('notifications').insert({
        user_id: tutor.user_id,
        title: 'Hiring Confirmed — Please Review Details',
        message: `You have been hired! Agreed salary: ৳${hiringForm.agreed_salary}/mo, Start: ${hiringForm.start_date}, Days/week: ${hiringForm.days_per_week}. Please confirm these details in your dashboard.`,
        type: 'hiring_confirmation',
        reference_id: jobId,
      });
    }

    setHiringDialogOpen(false);
    setHiringApp(null);
    toast({ title: 'Tutor Hired!', description: 'Hiring confirmation created. The tutor has been notified to confirm the details.' });
    fetchData();
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

  const subjectOptions = useMemo(() => subjects.map(s => ({
    value: s.id,
    label: s.name_en,
  })), [subjects]);

  const cityOptions = useMemo(() => {
    const distMap = new Map(districts.map(d => [d.id, d.name_en]));
    return areas
      .map(a => ({
        value: a.id,
        label: distMap.get(a.district_id) ? `${a.name_en} (${distMap.get(a.district_id)})` : a.name_en,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [areas, districts]);

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
  const draftJobs = jobs.filter(j => j.status === 'draft');
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
      case 'draft': return 'bg-secondary text-secondary-foreground';
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
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  // ─── Section title for header ───
  const sectionTitle = sectionItems.find(s => s.key === activeSection)?.title || 'Dashboard';

  // Post Job Inline Page
  const postJobPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{editingJob ? 'Edit Tuition Job' : 'Post a Tuition Job'}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            Fill in the details below. The job will be reviewed by our team before going live.
            {!editingJob && <Badge className="bg-primary text-primary-foreground">Free Posting</Badge>}
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => { setShowPostJob(false); setEditingJob(null); resetJobForm(); }}>Cancel</Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={editingJob ? handleUpdateJob : handlePostJob} className="space-y-5">

          {prefilled && !editingJob && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-accent/50 border border-accent text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Previous job data loaded — update as needed</span>
            </div>
          )}
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
              <div className="flex gap-2">
                <Select value={jobForm.category} onValueChange={(v) => setJobForm({ ...jobForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {JOB_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jobForm.category && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setJobForm({ ...jobForm, category: '' })} title="Clear category">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Background</Label>
              <div className="flex gap-2">
                <Select value={jobForm.background} onValueChange={(v) => setJobForm({ ...jobForm, background: v })}>
                  <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
                  <SelectContent>
                    {STUDENT_BACKGROUNDS.map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jobForm.background && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setJobForm({ ...jobForm, background: '' })} title="Clear background">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
                searchPlaceholder="Type to search or add a subject..."
                emptyText="No subjects found."
                createLabel="Add subject"
                onCreateOption={async (name) => {
                  const { data, error } = await supabase
                    .from('subjects')
                    .insert({ name_en: name})
                    .select('id, name_en, category_en, created_at')
                    .single();
                  if (error || !data) {
                    toast({ title: 'Could not add subject', description: error?.message, variant: 'destructive' });
                    return null;
                  }
                  setSubjects(prev => [...prev, data as unknown as typeof subjects[number]]);
                  return data.id;
                }}
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
              <Input
                type="number"
                min={1}
                max={50}
                value={jobForm.number_of_students}
                onChange={(e) => setJobForm({ ...jobForm, number_of_students: Math.max(1, Number(e.target.value) || 1) })}
                placeholder="Type number of students"
              />
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
              <Label>Student School Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Dhaka Residential Model College"
                value={jobForm.student_school_name}
                onChange={(e) => setJobForm({ ...jobForm, student_school_name: e.target.value })}
                required
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
              <Select value={jobForm.preferred_time} onValueChange={(v) => setJobForm({ ...jobForm, preferred_time: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select preferred time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flexible / Anytime">Flexible / Anytime</SelectItem>
                  <SelectItem value="Morning (6 AM – 9 AM)">Morning (6 AM – 9 AM)</SelectItem>
                  <SelectItem value="Late Morning (9 AM – 12 PM)">Late Morning (9 AM – 12 PM)</SelectItem>
                  <SelectItem value="Afternoon (12 PM – 4 PM)">Afternoon (12 PM – 4 PM)</SelectItem>
                  <SelectItem value="After Evening (Anytime)">After Evening (Anytime)</SelectItem>
                  <SelectItem value="Evening (4 PM – 7 PM)">Evening (4 PM – 7 PM)</SelectItem>
                  <SelectItem value="Night (7 PM – 10 PM)">Night (7 PM – 10 PM)</SelectItem>
                  <SelectItem value="Weekends Only">Weekends Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Choose a flexible time slot — tutors will see what works for you.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Fixed Time (Optional)</Label>
              <Input
                type="time"
                value={jobForm.fixed_time}
                onChange={(e) => setJobForm({ ...jobForm, fixed_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">If you need a specific clock time (e.g. 5:00 PM), set it here.</p>
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
          <div>
            <Label>City (Thana / Upazila) *</Label>
            <SearchableSelect
              options={cityOptions}
              value={jobForm.area_id}
              onValueChange={(v) => {
                const area = areas.find(a => a.id === v);
                setJobForm({ ...jobForm, area_id: v, district_id: area?.district_id || '' });
              }}
              placeholder="Search city..."
              searchPlaceholder="Type to search cities..."
              emptyText="No cities found."
            />
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
      </CardContent>
    </Card>
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
            <Label className="mb-2 block">Class Fee (৳) — leave 0 for free demo</Label>
            <Input type="number" min={0} step={10} value={interviewFee} onChange={(e) => setInterviewFee(e.target.value)} />
            {Number(interviewFee) > 0 && (() => {
              const s = computeFeeSplit(Number(interviewFee), interviewCommissionPct);
              return (
                <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs space-y-1">
                  <div className="font-medium text-foreground">Split ({s.commissionPct}% commission)</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Platform commission</span><span>৳{s.platformCommission}</span></div>
                  <div className="flex justify-between font-semibold"><span>Tutor payout</span><span>৳{s.tutorPayout}</span></div>
                </div>
              );
            })()}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {profileInfo.missing.map((item) => (
                      <Badge key={item} variant="outline" className="text-warning border-warning/50">
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">{profileInfo.percent}% complete</span>
                    <Link to="/parent/profile">
                      <Button size="sm">Edit Profile</Button>
                    </Link>
                  </div>
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

      {/* Free Posting Banner */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">Post Jobs for Free!</h3>
                <Badge className="bg-primary text-primary-foreground">Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Post unlimited tuition job ads at no cost. Find the perfect tutor for your child today.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { resetJobForm(); prefillFromLastJob(); setShowPostJob(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Post a Job (Free)
                </Button>
                <Link to="/tutors">
                  <Button size="sm" variant="outline">
                    <Search className="h-4 w-4 mr-1" />
                    Browse Tutors
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => setActiveSection('applicants')}>
                  <Users className="h-4 w-4 mr-1" />
                  View Applications
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection('applicants')}>
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
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setActiveSection('applicants'); setApplicantsStatusFilter('shortlisted'); }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shortlisted</p>
                <p className="text-3xl font-bold text-primary">{allApplicants.filter((a: any) => a.status === 'shortlisted').length}</p>
              </div>
              <Star className="h-8 w-8 text-primary" />
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
                <p className="text-sm text-muted-foreground">Active Tuitions</p>
                <p className="text-3xl font-bold text-accent">{activeJobs.length}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-accent" />
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
            <Button size="sm" onClick={() => { resetJobForm(); prefillFromLastJob(); setShowPostJob(true); }}>
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
                  <TabsTrigger value="draft">Drafts ({draftJobs.length})</TabsTrigger>
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
                    <div key={job.id} className="space-y-0">
                      <div
                        className={`p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer ${selectedJob?.id === job.id ? 'border-primary bg-primary/5 rounded-b-none' : ''} ${needsBoost ? 'border-accent/50' : ''}`}
                        onClick={() => {
                          if (selectedJob?.id === job.id) {
                            setSelectedJob(null);
                          } else {
                            setSelectedJob(job);
                            fetchApplications(job.id);
                          }
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
                                {formatExactDate(new Date(job.created_at))}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-center mr-1">
                              <div className="text-lg font-bold text-muted-foreground">{(job as any).total_views || 0}</div>
                              <div className="text-xs text-muted-foreground">views</div>
                            </div>
                            <div className="text-center mr-2">
                              <div className="text-lg font-bold text-primary">{job.total_applications}</div>
                              <div className="text-xs text-muted-foreground">applicants</div>
                            </div>
                            <div className="flex gap-1">
                              {(() => {
                                const boost = jobBoosts[job.id];
                                const isActive = !!job.is_featured && boost?.is_active && boost?.end_date && new Date(boost.end_date) > new Date();
                                const isExpired = !job.is_featured && !!boost?.end_date && new Date(boost.end_date) <= new Date();
                                if (isActive && boost) {
                                  return (
                                    <Badge
                                      className="bg-accent text-accent-foreground gap-1"
                                      title={`Featured until ${formatExactDate(new Date(boost.end_date))}`}
                                    >
                                      <Zap className="h-3 w-3" />
                                      Featured · ends {formatExactDate(new Date(boost.end_date))}
                                    </Badge>
                                  );
                                }
                                if (job.status === 'completed') return null;
                                if (isExpired) {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      title={`Re-boost (Featured for 30 days) — ৳${featuredJobPrice}`}
                                      className="h-8 gap-1 text-accent border-accent/40"
                                      disabled={boostingJobId === job.id}
                                      onClick={(e) => { e.stopPropagation(); handleBoostJob(job); }}
                                    >
                                      <Zap className="h-3.5 w-3.5" />
                                      Boost again
                                    </Button>
                                  );
                                }
                                return (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title={`Boost (Featured for 30 days) — ৳${featuredJobPrice}`}
                                    className="text-accent"
                                    disabled={boostingJobId === job.id}
                                    onClick={(e) => { e.stopPropagation(); handleBoostJob(job); }}
                                  >
                                    <Zap className="h-4 w-4" />
                                  </Button>
                                );
                              })()}
                              {job.status !== 'completed' && (
                                <Button size="icon" variant="ghost" title="Edit" onClick={(e) => { e.stopPropagation(); startEditJob(job); }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {(job.status === 'open' || job.status === 'pending_approval' || job.status === 'in_progress') && (
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
                              <Button size="icon" variant="ghost" className="text-destructive" title="Delete" onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this job permanently? This cannot be undone.')) deleteJob(job.id);
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedJob?.id === job.id && (
                        <div className="border border-t-0 border-primary rounded-b-xl bg-card p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4" />
                              Applicants
                              <Badge variant="outline">{applications.length}</Badge>
                            </h5>
                          </div>
                          {applications.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left">
                                    <th className="py-2 px-2 font-medium text-muted-foreground">Photo</th>
                                    <th className="py-2 px-2 font-medium text-muted-foreground">Name</th>
                                    <th className="py-2 px-2 font-medium text-muted-foreground">Date of Apply</th>
                                    <th className="py-2 px-2 font-medium text-muted-foreground">Proposed</th>
                                    <th className="py-2 px-2 font-medium text-muted-foreground">Status</th>
                                    <th className="py-2 px-2 font-medium text-muted-foreground text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {applications.map(app => {
                                    const tutor = app.tutor_profiles;
                                    const isVerified = tutor?.verification_status === 'approved' && tutor?.verification_paid;
                                    return (
                                      <tr key={app.id} className="border-b hover:bg-muted/50 transition-colors">
                                        <td className="py-2 px-2">
                                          <div className="relative">
                                            <Avatar className="h-9 w-9">
                                              <AvatarImage src={tutor?.profiles?.avatar_url} />
                                              <AvatarFallback>{tutor?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                                            </Avatar>
                                            {isVerified && (
                                              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-card" title="Verified Tutor">
                                                <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-2">
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-semibold">{tutor?.profiles?.full_name}</span>
                                              {isVerified && (
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">Verified</Badge>
                                              )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {tutor?.experience_years || 0} yrs exp
                                              {tutor?.education ? ` · ${tutor.education}` : ''}
                                              {tutor?.education_detail ? ` (${tutor.education_detail})` : ''}
                                            </span>
                                            {app.cover_message && (
                                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic max-w-[280px]">
                                                "{app.cover_message}"
                                              </p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                                          {format(new Date(app.created_at), 'dd MMM yyyy')}
                                        </td>
                                        <td className="py-2 px-2 font-medium whitespace-nowrap">
                                          ৳{app.proposed_rate}/mo
                                        </td>
                                        <td className="py-2 px-2">
                                          <Badge className={
                                            app.status === 'accepted' ? 'bg-success' :
                                            app.status === 'rejected' ? 'bg-destructive' :
                                            app.status === 'shortlisted' ? 'bg-primary' :
                                            app.status === 'invited_to_demo' ? 'bg-accent text-accent-foreground' :
                                            'bg-warning text-warning-foreground'
                                          }>
                                            {app.status === 'invited_to_demo' ? 'Invited' : app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                          </Badge>
                                        </td>
                                        <td className="py-2 px-2">
                                          <div className="flex items-center gap-1 justify-center flex-wrap">
                                            {(app.status === 'pending' || app.status === 'shortlisted') && (
                                              <>
                                                {app.status === 'pending' && (
                                                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'shortlisted')} title="Shortlist">
                                                    <Star className="h-3.5 w-3.5 mr-1" />
                                                    Shortlist
                                                  </Button>
                                                )}
                                                <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => handleInviteToInterview(app)}>
                                                  <Send className="h-3.5 w-3.5 mr-1" />
                                                  Invite to Demo
                                                </Button>
                                                <Button size="sm" className="h-8 text-xs" onClick={() => openHiringDialog(app)}>
                                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                  Hire
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'rejected')}>
                                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                                  Reject
                                                </Button>
                                              </>
                                            )}
                                            {app.status === 'invited_to_demo' && (
                                              <Badge className="bg-accent/20 text-accent-foreground border-accent/30">
                                                <Send className="h-3 w-3 mr-1" /> Demo Invited
                                              </Badge>
                                            )}
                                            {app.status === 'accepted' && (
                                              <Badge className="bg-success/10 text-success border-success/20">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Hired
                                              </Badge>
                                            )}
                                            {app.status === 'rejected' && (
                                              <span className="text-xs text-muted-foreground">Rejected</span>
                                            )}
                                            <Link to={`/tutor/${(tutor as any)?.slug || tutor?.id}`}>
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
                            <div className="text-center py-6">
                              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No applications yet</p>
                            </div>
                          )}
                        </div>
                      )}
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
              <Button onClick={() => { resetJobForm(); prefillFromLastJob(); setShowPostJob(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Post a Job
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(booking.preferred_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.preferred_time} ({booking.duration_minutes} min)
                      </span>
                      <span className="font-medium text-success">Free</span>
                    </div>
                    {booking.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">Note: {booking.notes}</p>
                    )}
                    {booking.cancellation_reason && (
                      <p className="text-xs text-destructive mt-2">Cancelled: {booking.cancellation_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge className={
                      booking.status === 'confirmed' ? 'bg-success' :
                      booking.status === 'completed' ? 'bg-primary' :
                      booking.status === 'cancelled' ? 'bg-destructive' :
                      booking.status === 'approved' ? 'bg-accent text-accent-foreground' :
                      'bg-warning text-warning-foreground'
                    }>
                      {booking.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {booking.status === 'confirmed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                    {(booking.status === 'confirmed' || booking.status === 'completed') && booking.status !== 'completed' && (
                      <div className="flex flex-col gap-1.5 items-end">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">After demo</span>
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleDemoResult(booking, 'confirmed')}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed (Hire)
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            const reason = window.prompt('Reason for cancelling?') || '';
                            if (reason !== null) handleDemoResult(booking, 'cancelled', reason);
                          }}>
                            <XCircle className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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
        <CardDescription>Transaction history and subscription status</CardDescription>
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

        {/* Demo Class Summary */}
        {demoBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Demo Classes
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xl font-bold text-primary">
                  {demoBookings.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> My Profile</CardTitle>
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
              {userProfile?.user_reference && <Badge variant="outline" className="font-mono text-xs mt-1">{userProfile.user_reference}</Badge>}
            </div>
          </div>
          <Progress value={profileInfo.percent} className="h-2 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{profileInfo.percent}% complete</p>
          {profileInfo.missing.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profileInfo.missing.map((item) => <Badge key={item} variant="outline" className="text-warning border-warning/50">Missing: {item}</Badge>)}
            </div>
          )}
          <Link to="/parent/profile"><Button><Edit className="h-4 w-4 mr-2" /> Edit Profile</Button></Link>
        </CardContent>
      </Card>

      {/* Student Profiles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Student Profiles</CardTitle>
              <CardDescription>Manage your children's learning profiles</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetStudentForm(); setShowStudentForm(true); }}><Plus className="h-4 w-4 mr-1" /> Add Student</Button>
          </div>
        </CardHeader>
        <CardContent>
          {showStudentForm && (
            <div className="p-4 border rounded-xl mb-4 bg-muted/30 space-y-3">
              <h4 className="font-semibold text-sm">{editingStudent ? 'Edit Student' : 'Add Student'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} placeholder="Student name" /></div>
                <div><Label>Age</Label><Input type="number" value={studentForm.age} onChange={e => setStudentForm({...studentForm, age: e.target.value})} placeholder="e.g. 12" /></div>
                <div><Label>Class Level</Label><Input value={studentForm.class_level} onChange={e => setStudentForm({...studentForm, class_level: e.target.value})} placeholder="e.g. Class 8" /></div>
                <div><Label>School</Label><Input value={studentForm.school_name} onChange={e => setStudentForm({...studentForm, school_name: e.target.value})} placeholder="School name" /></div>
                <div><Label>Medium</Label>
                  <Select value={studentForm.medium} onValueChange={v => setStudentForm({...studentForm, medium: v})}>
                    <SelectTrigger><SelectValue placeholder="Select medium" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bangla">Bangla Medium</SelectItem>
                      <SelectItem value="English">English Medium</SelectItem>
                      <SelectItem value="Madrasa">Madrasa</SelectItem>
                      <SelectItem value="English Version">English Version</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Learning Needs</Label><Input value={studentForm.learning_needs} onChange={e => setStudentForm({...studentForm, learning_needs: e.target.value})} placeholder="e.g. Needs help with Math" /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveStudent}>{editingStudent ? 'Update' : 'Save'}</Button>
                <Button size="sm" variant="outline" onClick={resetStudentForm}>Cancel</Button>
              </div>
            </div>
          )}
          {studentProfiles.length > 0 ? (
            <div className="space-y-3">
              {studentProfiles.map((s: any) => (
                <div key={s.id} className="p-4 border rounded-xl flex items-start justify-between">
                  <div>
                    <h4 className="font-bold">{s.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {s.age && <Badge variant="outline" className="text-xs">Age: {s.age}</Badge>}
                      {s.class_level && <Badge variant="outline" className="text-xs">{s.class_level}</Badge>}
                      {s.school_name && <Badge variant="outline" className="text-xs">{s.school_name}</Badge>}
                      {s.medium && <Badge variant="outline" className="text-xs">{s.medium}</Badge>}
                    </div>
                    {s.learning_needs && <p className="text-xs text-muted-foreground mt-1">{s.learning_needs}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEditStudent(s)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteStudent(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showStudentForm && (
            <div className="text-center py-8">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No student profiles yet. Add your children's details.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderApplicants = () => {
    const statusOptions: { key: typeof applicantsStatusFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'pending', label: 'Pending' },
      { key: 'shortlisted', label: 'Shortlisted' },
      { key: 'contact_requested', label: 'Contact Requested' },
      { key: 'contact_released', label: 'Contact Released' },
      { key: 'invited_to_demo', label: 'Invited' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'rejected', label: 'Rejected' },
    ];
    const filteredApplicants = applicantsStatusFilter === 'all'
      ? allApplicants
      : allApplicants.filter((a: any) => a.status === applicantsStatusFilter);
    return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          All Applicants
          <Badge variant="outline">{filteredApplicants.length}</Badge>
        </CardTitle>
        <CardDescription>Tutors who applied to any of your job posts</CardDescription>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {statusOptions.map(opt => {
            const count = opt.key === 'all' ? allApplicants.length : allApplicants.filter((a: any) => a.status === opt.key).length;
            const active = applicantsStatusFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setApplicantsStatusFilter(opt.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              >
                {opt.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {filteredApplicants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 px-2 font-medium text-muted-foreground">Photo</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Name</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Job</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Proposed</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="py-3 px-2 font-medium text-muted-foreground text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplicants.map((app: any) => {
                  const tutor = app.tutor_profiles;
                  const isVerified = tutor?.verification_status === 'approved' && tutor?.verification_paid;
                  return (
                    <tr key={app.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={tutor?.profiles?.avatar_url} />
                            <AvatarFallback>{tutor?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                          </Avatar>
                          {isVerified && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-card" title="Verified Tutor">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{tutor?.profiles?.full_name}</span>
                            {isVerified && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">Verified</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {tutor?.experience_years || 0} yrs
                            {tutor?.education ? ` · ${tutor.education}` : ''}
                          </span>
                          {app.cover_message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic max-w-[200px]">
                              "{app.cover_message}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium truncate max-w-[180px]">{app.jobs?.title}</span>
                          <span className="text-xs text-muted-foreground">{app.jobs?.job_reference}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap text-xs">
                        {format(new Date(app.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3 px-2 font-medium whitespace-nowrap">৳{app.proposed_rate}/mo</td>
                      <td className="py-3 px-2">
                        <Badge className={
                          app.status === 'accepted' ? 'bg-success' :
                          app.status === 'rejected' ? 'bg-destructive' :
                          app.status === 'shortlisted' ? 'bg-primary' :
                          app.status === 'invited_to_demo' ? 'bg-accent text-accent-foreground' :
                          app.status === 'contact_requested' ? 'bg-warning text-warning-foreground' :
                          app.status === 'contact_released' ? 'bg-success/80' :
                          'bg-warning text-warning-foreground'
                        }>
                          {app.status === 'invited_to_demo' ? 'Invited' : 
                           app.status === 'contact_requested' ? 'Contact Requested' :
                           app.status === 'contact_released' ? 'Contact Released' :
                           app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 justify-center flex-wrap">
                          {(app.status === 'pending' || app.status === 'shortlisted' || app.status === 'contact_released') && (
                            <>
                              {app.status === 'pending' && (
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'shortlisted')} title="Shortlist">
                                  <Star className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {app.status === 'shortlisted' && (
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'contact_requested')} title="Request Contact Info">
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => {
                                const job = jobs.find(j => j.id === app.jobs?.id);
                                if (job) setSelectedJob(job);
                                handleInviteToInterview(app);
                              }} title="Invite to demo class">
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" className="h-8 text-xs" onClick={() => { const job = jobs.find(j => j.id === app.jobs?.id); if (job) setSelectedJob(job); openHiringDialog(app); }} title="Hire">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleApplicationAction(app.id, 'rejected')} title="Reject">
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Link to={`/tutor/${(tutor as any)?.slug || tutor?.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 text-xs">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {applicantsStatusFilter === 'all' ? 'No applicants yet across your jobs' : `No ${applicantsStatusFilter.replace('_', ' ')} applicants`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  const renderTuitions = () => {
    const hiredApps = allApplicants.filter((a: any) => a.status === 'accepted');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Active Tuitions</CardTitle>
          <CardDescription>Currently active tutoring engagements</CardDescription>
        </CardHeader>
        <CardContent>
          {hiredApps.length > 0 ? (
            <div className="space-y-4">
              {hiredApps.map((app: any) => {
                const tutor = app.tutor_profiles;
                const hc = hiringConfirmations.find((h: any) => h.application_id === app.id);
                return (
                  <div key={app.id} className="p-4 border rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={tutor?.profiles?.avatar_url} />
                          <AvatarFallback>{tutor?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{tutor?.profiles?.full_name}</span>
                            {tutor?.verification_status === 'approved' && tutor?.verification_paid && (
                              <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">Verified</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{app.jobs?.title} · {app.jobs?.job_reference}</p>
                          {hc && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">৳{hc.agreed_salary}/mo</Badge>
                              <Badge variant="outline" className="text-xs">Start: {hc.start_date}</Badge>
                              <Badge variant="outline" className="text-xs">{hc.days_per_week} days/wk</Badge>
                              {hc.tutor_confirmed ? (
                                <Badge className="bg-success text-[10px]">Both Confirmed</Badge>
                              ) : (
                                <Badge className="bg-warning text-warning-foreground text-[10px]">Awaiting Tutor Confirmation</Badge>
                              )}
                            </div>
                          )}
                          {!hc && <p className="text-xs text-muted-foreground mt-1">৳{app.proposed_rate}/mo (proposed)</p>}
                        </div>
                      </div>
                      <Link to={`/tutor/${(tutor as any)?.slug || tutor?.id}`}>
                        <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" /> Profile</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-bold mb-2">No active tuitions yet</h3>
              <p className="text-muted-foreground mb-4">Hire a tutor from your applicants to start</p>
              <Button variant="outline" onClick={() => setActiveSection('applicants')}>View Applicants</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'jobs': return renderJobs();
      case 'applicants': return renderApplicants();
      case 'tuitions': return renderTuitions();
      case 'demo': return renderDemoBookings();
      case 'payments': return renderPayments();
      case 'profile': return renderProfile();
      case 'help': return <ParentHelpSupport />;
      case 'settings': return <ParentSettings />;
      default: return renderOverview();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ParentSidebar activeSection={activeSection} setActiveSection={setActiveSection} onPostJob={() => { resetJobForm(); prefillFromLastJob(); setShowPostJob(true); }} pendingApplicants={allApplicants.filter((a: any) => a.status === 'pending').length} onApplicantsClick={() => setApplicantsStatusFilter('pending')} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:inline-flex" />
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

          <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
            <div className="max-w-[1200px] mx-auto p-4 md:p-6">
              {showPostJob ? postJobPage : renderActiveSection()}
            </div>
          </main>
          <ParentBottomNav
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            pendingApplicants={allApplicants.filter((a: any) => a.status === 'pending').length}
          />
        </div>
      </div>

      {reportDialog}
      {interviewDialog}

      {/* Hiring Confirmation Dialog */}
      <Dialog open={hiringDialogOpen} onOpenChange={setHiringDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Confirm Hiring Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {hiringApp && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={hiringApp.tutor_profiles?.profiles?.avatar_url} />
                  <AvatarFallback>{hiringApp.tutor_profiles?.profiles?.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{hiringApp.tutor_profiles?.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">Proposed: ৳{hiringApp.proposed_rate}/mo</p>
                </div>
              </div>
            )}
            <div>
              <Label>Agreed Monthly Salary (৳) *</Label>
              <Input type="number" min={0} value={hiringForm.agreed_salary} onChange={e => setHiringForm({ ...hiringForm, agreed_salary: e.target.value })} placeholder="e.g. 5000" />
              <p className="text-xs text-muted-foreground mt-1">This triggers the tutor's commission obligation.</p>
            </div>
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={hiringForm.start_date} onChange={e => setHiringForm({ ...hiringForm, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Subjects</Label>
              <Input value={hiringForm.subjects} onChange={e => setHiringForm({ ...hiringForm, subjects: e.target.value })} placeholder="e.g. Math, Physics" />
            </div>
            <div>
              <Label>Days per Week</Label>
              <Select value={hiringForm.days_per_week} onValueChange={v => setHiringForm({ ...hiringForm, days_per_week: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n} day{n>1?'s':''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHiringDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmHiring} disabled={!hiringForm.agreed_salary || !hiringForm.start_date}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm & Hire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
