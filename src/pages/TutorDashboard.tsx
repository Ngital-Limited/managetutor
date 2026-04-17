import { useState, useEffect } from 'react';
import { formatExactDate } from '@/lib/date';
import { Logo } from '@/components/Logo';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  GraduationCap, LogOut, Globe, Briefcase, Star, User,
  CheckCircle2, Clock, XCircle, DollarSign, TrendingUp, Calendar, MapPin,
  BookOpen, Settings, Eye, ArrowRight, AlertCircle, Phone, Mail, Zap, Sparkles, Crown,
  Home, Search, CreditCard, FileText
} from 'lucide-react';
import { generateTutorCV } from '@/components/TutorCVGenerator';

interface Application {
  id: string;
  status: string;
  proposed_rate: number;
  created_at: string;
  cover_message: string;
  jobs: {
    id: string;
    title: string;
    status: string;
    budget_min: number;
    budget_max: number;
    parent_id: string;
    districts: { name_en: string };
    subjects: { name_en: string } | null;
    profiles: { full_name: string; phone: string; email: string } | null;
  };
}

interface RecommendedJob {
  id: string;
  title: string;
  budget_min: number;
  budget_max: number;
  teaching_mode: string;
  class_level: string;
  created_at: string;
  districts: { name_en: string; name_bn: string } | null;
  subjects: { name_en: string; name_bn: string } | null;
}

interface TutorProfile {
  id: string;
  bio: string;
  education: string;
  experience_years: number;
  monthly_salary_min: number;
  monthly_salary_max: number;
  average_rating: number;
  total_reviews: number;
  total_students: number;
  is_available: boolean;
  is_featured: boolean;
  verification_status: string;
  verification_paid: boolean;
}

interface FeaturedListing {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  amount_paid: number;
  listing_type: string;
}

const tutorSidebarItems = [
  { title: 'Dashboard', url: '/tutor/dashboard', icon: Home },
  { title: 'My Applications', url: '/tutor/applications', icon: FileText },
  { title: 'Demo Classes', url: '/tutor/dashboard#demo-classes', icon: Calendar },
  { title: 'Browse Jobs', url: '/jobs', icon: Briefcase },
  { title: 'My Profile', url: '/tutor/profile', icon: User },
  { title: 'Find Tutors', url: '/tutors', icon: Search },
  { title: 'Pricing', url: '/pricing', icon: CreditCard },
];

function TutorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, user } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <Sidebar collapsible="none">
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
              {tutorSidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/tutor/dashboard'}
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

export default function TutorDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Scroll to hash section when route changes
  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location.hash]);

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string; user_reference: string | null } | null>(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    acceptedApplications: 0,
    pendingApplications: 0,
    activeJobs: 0,
    totalEarnings: 0,
  });
  const [activeFeatured, setActiveFeatured] = useState<FeaturedListing | null>(null);
  const [boostLoading, setBoostLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [demoBookings, setDemoBookings] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [nearbyJobs, setNearbyJobs] = useState<RecommendedJob[]>([]);
  const [highPayJobs, setHighPayJobs] = useState<RecommendedJob[]>([]);
  const [jobTab, setJobTab] = useState('recommended');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, user_reference')
      .eq('id', user.id)
      .single();

    if (profileData) setUserProfile(profileData);

    // Fetch tutor profile
    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tutorData) {
      setProfile(tutorData);

      // Fetch applications
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          *,
          jobs (
            id, slug, title, status, budget_min, budget_max, parent_id,
            districts (name_en),
            subjects (name_en),
            profiles:parent_id (full_name, phone, email)
          )
        `)
        .eq('tutor_id', tutorData.id)
        .order('created_at', { ascending: false });

      if (apps) {
        setApplications(apps as unknown as Application[]);
        
        // Calculate stats
        const accepted = apps.filter(a => a.status === 'accepted');
        const pending = apps.filter(a => a.status === 'pending');
        const activeJobs = accepted.filter(a => a.jobs?.status === 'in_progress');
        
        setStats({
          totalApplications: apps.length,
          acceptedApplications: accepted.length,
          pendingApplications: pending.length,
          activeJobs: activeJobs.length,
          totalEarnings: accepted.reduce((sum, a) => sum + (a.proposed_rate || 0), 0),
        });
      }
      // Fetch active featured listing
      const { data: featuredData } = await supabase
        .from('featured_listings')
        .select('*')
        .eq('tutor_id', tutorData.id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (featuredData) {
        setActiveFeatured(featuredData as FeaturedListing);
      }

      // Fetch demo bookings
      const { data: bookingsData } = await supabase
        .from('demo_bookings')
        .select('*, subjects(name_en, name_bn), profiles:parent_id(full_name, phone, email)')
        .eq('tutor_id', tutorData.id)
        .order('created_at', { ascending: false });

      if (bookingsData) {
        setDemoBookings(bookingsData);
      }

      // Fetch recommended jobs
      const tutorSubjectsRes = await supabase
        .from('tutor_subjects')
        .select('subject_id')
        .eq('tutor_profile_id', tutorData.id);
      const tutorSubjectIds = tutorSubjectsRes.data?.map(s => s.subject_id) || [];

      // Applied job IDs to exclude
      const appliedJobIds = (apps || []).map(a => a.job_id);

      // Recommended: matching subjects
      let recQuery = supabase
        .from('jobs')
        .select('id, slug, title, budget_min, budget_max, teaching_mode, class_level, created_at, districts(name_en, name_bn), subjects(name_en, name_bn)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10);
      if (tutorSubjectIds.length > 0) {
        recQuery = recQuery.in('subject_id', tutorSubjectIds);
      }
      if (appliedJobIds.length > 0) {
        recQuery = recQuery.not('id', 'in', `(${appliedJobIds.join(',')})`);
      }
      const { data: recJobs } = await recQuery;
      setRecommendedJobs((recJobs || []) as unknown as RecommendedJob[]);

      // Near your location
      if (tutorData.district_id) {
        let nearQuery = supabase
          .from('jobs')
          .select('id, slug, title, budget_min, budget_max, teaching_mode, class_level, created_at, districts(name_en, name_bn), subjects(name_en, name_bn)')
          .eq('status', 'open')
          .eq('district_id', tutorData.district_id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (appliedJobIds.length > 0) {
          nearQuery = nearQuery.not('id', 'in', `(${appliedJobIds.join(',')})`);
        }
        const { data: nearData } = await nearQuery;
        setNearbyJobs((nearData || []) as unknown as RecommendedJob[]);
      }

      // High-paying jobs
      let highQuery = supabase
        .from('jobs')
        .select('id, slug, title, budget_min, budget_max, teaching_mode, class_level, created_at, districts(name_en, name_bn), subjects(name_en, name_bn)')
        .eq('status', 'open')
        .order('budget_max', { ascending: false })
        .limit(10);
      if (appliedJobIds.length > 0) {
        highQuery = highQuery.not('id', 'in', `(${appliedJobIds.join(',')})`);
      }
      const { data: highData } = await highQuery;
      setHighPayJobs((highData || []) as unknown as RecommendedJob[]);
    }

    setLoading(false);
  };

  const handleBoostProfile = async (days: number, price: number) => {
    if (!profile || !user) return;
    setBoostLoading(true);
    
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Create featured listing
      const { error: listingError } = await supabase
        .from('featured_listings')
        .insert({
          tutor_id: profile.id,
          listing_type: 'tutor_profile',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          amount_paid: price,
          is_active: true,
        });

      if (listingError) throw listingError;

      // Update tutor profile
      const { error: profileError } = await supabase
        .from('tutor_profiles')
        .update({ is_featured: true })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      toast({ title: 'Profile Boosted!', description: `Your profile is now featured for ${days} days.` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setBoostLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from('demo_bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Booking ${status} successfully.` });
      fetchData();
    }
  };

  const withdrawApplication = async (appId: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Withdrawn', description: 'Application withdrawn successfully.' });
      fetchData();
    }
  };

  const getProfileCompleteness = () => {
    if (!profile) return 0;
    let complete = 0;
    if (profile.bio) complete += 20;
    if (profile.education) complete += 20;
    if (profile.experience_years > 0) complete += 20;
    if (profile.monthly_salary_min > 0) complete += 20;
    if (profile.verification_status === 'approved') complete += 20;
    return complete;
  };

  const handlePayForVerification = async () => {
    if (!user || !userProfile) return;
    setVerifyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sslcommerz-init', {
        body: {
          amount: 50,
          productName: 'Verified Badge',
          productCategory: 'Verification',
          customerName: userProfile.full_name,
          customerEmail: user.email,
          customerPhone: '01700000000',
          userId: user.id,
          listingType: 'verification_badge',
        },
      });
      if (error) throw error;
      if (data?.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        throw new Error('No gateway URL returned');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Payment initiation failed', variant: 'destructive' });
    }
    setVerifyLoading(false);
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

  const profileComplete = getProfileCompleteness();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TutorSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-lg font-bold hidden sm:inline">Tutor Dashboard</span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.avatar_url || ''} />
              <AvatarFallback className="text-xl">{userProfile?.full_name?.charAt(0) || 'T'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {userProfile?.full_name || 'Tutor'}!</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-tutor text-tutor-foreground">Tutor</Badge>
                {userProfile?.user_reference && (
                  <Badge variant="outline" className="font-mono text-xs">{userProfile.user_reference}</Badge>
                )}
                {profile?.verification_status === 'approved' && profile?.verification_paid && (
                  <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                )}
                {profile?.is_available && (
                  <Badge variant="outline" className="text-success border-success">Available</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!user) return;
                try {
                  await generateTutorCV(user.id);
                } catch {
                  toast({ title: 'Error', description: 'Failed to generate CV', variant: 'destructive' });
                }
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download CV
            </Button>
            <Link to="/tutor/profile">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Completeness Warning */}
        {profileComplete < 100 && (
          <Card className="mb-6 border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    A complete profile helps you get more job applications
                  </p>
                  <Progress value={profileComplete} className="mt-2 h-2" />
                </div>
                <Link to="/tutor/profile">
                  <Button>Complete Profile</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Get Verified Badge CTA */}
        {profile?.verification_status !== 'approved' && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold">Get Verified Badge</h3>
                  <p className="text-sm text-muted-foreground">
                    Stand out with a verified badge on your profile. Parents trust verified tutors more. Only ৳50 one-time fee.
                  </p>
                </div>
                <Button onClick={handlePayForVerification} disabled={verifyLoading}>
                  {verifyLoading ? 'Processing...' : 'Pay ৳50 & Verify'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                  <p className="text-3xl font-bold">{stats.totalApplications}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-3xl font-bold text-success">{stats.acceptedApplications}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                  <p className="text-3xl font-bold text-tutor">{stats.activeJobs}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-tutor/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-tutor" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-3xl font-bold text-accent">{profile?.average_rating || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-accent" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{profile?.total_reviews || 0} reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Link to="/jobs">
            <Card className="hover-lift cursor-pointer h-32">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <Briefcase className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-bold">Browse Jobs</h3>
                <p className="text-xs text-muted-foreground">Find new opportunities</p>
              </CardContent>
            </Card>
          </Link>


          <Link to="/tutor/profile">
            <Card className="hover-lift cursor-pointer h-32">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <User className="h-8 w-8 text-tutor mb-2" />
                <h3 className="font-bold">My Profile</h3>
                <p className="text-xs text-muted-foreground">Update your info</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Boost Profile Section */}
        <Card className="mb-8 border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Boost Your Profile
            </CardTitle>
            <CardDescription>
              Get featured at the top of search results and attract more students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeFeatured ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                <Crown className="h-8 w-8 text-accent" />
                <div className="flex-1">
                  <p className="font-bold text-accent">Your profile is currently boosted!</p>
                  <p className="text-sm text-muted-foreground">
                    Active until {new Date(activeFeatured.end_date).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                  </p>
                </div>
                <Badge className="bg-accent text-accent-foreground">
                  <Zap className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-primary">৳199</p>
                    <p className="text-sm text-muted-foreground mb-1">7 Days</p>
                    <p className="text-xs text-muted-foreground mb-4">~৳28/day</p>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled={boostLoading}
                      onClick={() => handleBoostProfile(7, 199)}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Boost 7 Days
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-accent shadow-md shadow-accent/10 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground px-3">Best Value</Badge>
                  </div>
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-accent">৳499</p>
                    <p className="text-sm text-muted-foreground mb-1">30 Days</p>
                    <p className="text-xs text-muted-foreground mb-4">~৳17/day</p>
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={boostLoading}
                      onClick={() => handleBoostProfile(30, 499)}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Boost 30 Days
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-primary">৳1,299</p>
                    <p className="text-sm text-muted-foreground mb-1">90 Days</p>
                    <p className="text-xs text-muted-foreground mb-4">~৳14/day</p>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled={boostLoading}
                      onClick={() => handleBoostProfile(90, 1299)}
                    >
                      <Crown className="h-4 w-4 mr-1" />
                      Boost 90 Days
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Jobs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Job Recommendations
            </CardTitle>
            <CardDescription>Jobs matched to your profile, location, and earning potential</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={jobTab} onValueChange={setJobTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="recommended">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Recommended ({recommendedJobs.length})
                </TabsTrigger>
                <TabsTrigger value="nearby">
                  <MapPin className="h-3 w-3 mr-1" />
                  Near You ({nearbyJobs.length})
                </TabsTrigger>
                <TabsTrigger value="highpay">
                  <DollarSign className="h-3 w-3 mr-1" />
                  High-Paying ({highPayJobs.length})
                </TabsTrigger>
              </TabsList>

              {['recommended', 'nearby', 'highpay'].map(tab => {
                const jobList = tab === 'recommended' ? recommendedJobs : tab === 'nearby' ? nearbyJobs : highPayJobs;
                return (
                  <TabsContent key={tab} value={tab} className="space-y-3">
                    {jobList.length > 0 ? jobList.map(job => (
                      <Link key={job.id} to={`/jobs/${(job as any).slug || job.id}`} className="block">
                        <div className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-foreground hover:text-primary transition-colors">{job.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {job.districts && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.districts.name_en}
                                  </span>
                                )}
                                {job.subjects && (
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {job.subjects.name_en}
                                  </span>
                                )}
                                {job.class_level && (
                                  <Badge variant="outline" className="text-xs">{job.class_level}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {(job.budget_min || job.budget_max) && (
                                <p className="font-bold text-primary">
                                  ৳{job.budget_min || 0} - ৳{job.budget_max || 0}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatExactDate(new Date(job.created_at))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )) : (
                      <div className="text-center py-8">
                        <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No {tab === 'recommended' ? 'recommended' : tab === 'nearby' ? 'nearby' : 'high-paying'} jobs found</p>
                        <Link to="/jobs">
                          <Button variant="link" className="mt-2">Browse All Jobs <ArrowRight className="h-4 w-4 ml-1" /></Button>
                        </Link>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Demo Class Bookings */}
        {demoBookings.length > 0 && (
          <Card className="mb-8" id="demo-classes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Demo Class Bookings
              </CardTitle>
              <CardDescription>Manage trial lesson requests from parents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoBookings.map((booking: any) => (
                <div key={booking.id} className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{booking.profiles?.full_name || 'Parent'}</h4>
                        {booking.subjects && (
                          <Badge variant="secondary">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {booking.subjects.name_en}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(booking.preferred_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {booking.preferred_time} ({booking.duration_minutes} min)
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ৳{booking.tutor_payout} payout
                        </span>
                      </div>
                      {booking.notes && (
                        <p className="text-sm text-muted-foreground italic">"{booking.notes}"</p>
                      )}
                      {booking.status === 'confirmed' && booking.profiles && (
                        <div className="mt-2 p-2 bg-success/10 rounded-lg text-sm">
                          <span className="font-medium text-success">Contact: </span>
                          {booking.profiles.phone && (
                            <a href={`tel:${booking.profiles.phone}`} className="text-primary hover:underline mr-3">
                              <Phone className="h-3 w-3 inline mr-1" />{booking.profiles.phone}
                            </a>
                          )}
                          {booking.profiles.email && (
                            <a href={`mailto:${booking.profiles.email}`} className="text-primary hover:underline">
                              <Mail className="h-3 w-3 inline mr-1" />{booking.profiles.email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                      {booking.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => updateBookingStatus(booking.id, 'confirmed')}>
                            Accept
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                            Decline
                          </Button>
                        </div>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.id, 'completed')}>
                          Mark Done
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Applications */}
        <Card id="applications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Applications
            </CardTitle>
            <CardDescription>Track your job applications</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <Tabs defaultValue="all">
                <TabsList className="mb-4 flex-wrap">
                  <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({stats.pendingApplications})</TabsTrigger>
                  <TabsTrigger value="accepted">Shortlisted ({stats.acceptedApplications})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({applications.filter(a => a.status === 'rejected').length})</TabsTrigger>
                  <TabsTrigger value="withdrawn">Withdrawn ({applications.filter(a => a.status === 'withdrawn').length})</TabsTrigger>
                </TabsList>

                {['all', 'pending', 'accepted', 'rejected', 'withdrawn'].map(tab => (
                  <TabsContent key={tab} value={tab} className="space-y-4">
                    {applications
                      .filter(a => tab === 'all' || a.status === tab)
                      .map(app => (
                        <div key={app.id} className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link to={`/jobs/${(app.jobs as any)?.slug || app.jobs?.id}`} className="hover:text-primary">
                                <h4 className="font-bold mb-1">{app.jobs?.title}</h4>
                              </Link>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {app.jobs?.districts?.name_en}
                                </span>
                                {app.jobs?.subjects && (
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {app.jobs.subjects.name_en}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Your Rate: ৳{app.proposed_rate}/mo</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Applied {formatExactDate(new Date(app.created_at))}
                                </span>
                              </div>
                              
                              {/* Show parent contact when accepted */}
                              {app.status === 'accepted' && app.jobs?.profiles && (
                                <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                                  <p className="text-sm font-medium text-success mb-2">
                                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                                    Contact Parent
                                  </p>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {app.jobs.profiles.full_name || 'Parent'}
                                    </span>
                                    {app.jobs.profiles.phone && (
                                      <a href={`tel:${app.jobs.profiles.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                                        <Phone className="h-3 w-3" />
                                        {app.jobs.profiles.phone}
                                      </a>
                                    )}
                                    {app.jobs.profiles.email && (
                                      <a href={`mailto:${app.jobs.profiles.email}`} className="flex items-center gap-1 text-primary hover:underline">
                                        <Mail className="h-3 w-3" />
                                        {app.jobs.profiles.email}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                app.status === 'accepted' ? 'bg-success' :
                                app.status === 'rejected' ? 'bg-destructive' :
                                app.status === 'pending' ? 'bg-warning text-warning-foreground' : ''
                              }>
                                {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {app.status === 'accepted' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </Badge>
                              {app.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-destructive"
                                  onClick={() => withdrawApplication(app.id)}
                                >
                                  Withdraw
                                </Button>
                              )}
                              <Link to={`/jobs/${(app.jobs as any)?.slug || app.jobs?.id}`}>
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    {applications.filter(a => tab === 'all' || a.status === tab).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No {tab === 'all' ? '' : tab} applications</p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">Start applying to tuition jobs to grow your teaching career</p>
                <Link to="/jobs">
                  <Button>
                    Browse Jobs
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
