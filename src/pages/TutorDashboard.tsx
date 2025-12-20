import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { formatDistanceToNow } from 'date-fns';
import {
  GraduationCap, LogOut, Globe, Briefcase, MessageSquare, Star, User,
  CheckCircle2, Clock, XCircle, DollarSign, TrendingUp, Calendar, MapPin,
  BookOpen, Settings, Eye, ArrowRight, AlertCircle
} from 'lucide-react';

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
    districts: { name_en: string };
    subjects: { name_en: string } | null;
  };
}

interface TutorProfile {
  id: string;
  bio: string;
  education: string;
  experience_years: number;
  hourly_rate_min: number;
  hourly_rate_max: number;
  average_rating: number;
  total_reviews: number;
  total_students: number;
  is_available: boolean;
  verification_status: string;
}

export default function TutorDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string } | null>(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    acceptedApplications: 0,
    pendingApplications: 0,
    activeJobs: 0,
    totalEarnings: 0,
  });

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
      .select('full_name, avatar_url')
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
            id, title, status, budget_min, budget_max,
            districts (name_en),
            subjects (name_en)
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
    }

    setLoading(false);
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
    if (profile.hourly_rate_min > 0) complete += 20;
    if (profile.verification_status === 'approved') complete += 20;
    return complete;
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
              <AvatarFallback className="text-xl">{userProfile?.full_name?.charAt(0) || 'T'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {userProfile?.full_name || 'Tutor'}!</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-tutor text-tutor-foreground">Tutor</Badge>
                {profile?.verification_status === 'approved' && (
                  <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                )}
                {profile?.is_available && (
                  <Badge variant="outline" className="text-success border-success">Available</Badge>
                )}
              </div>
            </div>
          </div>
          <Link to="/tutor/profile">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
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

          <Link to="/messages">
            <Card className="hover-lift cursor-pointer h-32">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <MessageSquare className="h-8 w-8 text-info mb-2" />
                <h3 className="font-bold">Messages</h3>
                <p className="text-xs text-muted-foreground">Chat with parents</p>
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

        {/* Applications */}
        <Card>
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
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({stats.pendingApplications})</TabsTrigger>
                  <TabsTrigger value="accepted">Accepted ({stats.acceptedApplications})</TabsTrigger>
                </TabsList>

                {['all', 'pending', 'accepted', 'rejected'].map(tab => (
                  <TabsContent key={tab} value={tab} className="space-y-4">
                    {applications
                      .filter(a => tab === 'all' || a.status === tab)
                      .map(app => (
                        <div key={app.id} className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Link to={`/jobs/${app.jobs?.id}`} className="hover:text-primary">
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
                                  Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                </span>
                              </div>
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
                              <Link to={`/jobs/${app.jobs?.id}`}>
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
  );
}
