import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Logo } from '@/components/Logo';
import { NotificationBell } from '@/components/NotificationBell';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  Briefcase, Clock, CheckCircle2, XCircle, MapPin, BookOpen,
  Eye, ArrowRight, User, Phone, Mail, LogOut, Globe,
  Home, Search, CreditCard, FileText, Calendar, GraduationCap,
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
    parent_id: string;
    districts: { name_en: string };
    subjects: { name_en: string } | null;
    profiles: { full_name: string; phone: string; email: string } | null;
  };
}

const sidebarItems = [
  { title: 'Dashboard', url: '/tutor/dashboard', icon: Home },
  { title: 'My Applications', url: '/tutor/applications', icon: FileText },
  { title: 'Demo Classes', url: '/tutor/dashboard#demo-classes', icon: Calendar },
  { title: 'Browse Jobs', url: '/jobs', icon: Briefcase },
  { title: 'My Profile', url: '/tutor/profile', icon: User },
  { title: 'Find Tutors', url: '/tutors', icon: Search },
  { title: 'Pricing', url: '/pricing', icon: CreditCard },
];

function TutorAppSidebar() {
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
          <SidebarGroupLabel>{!collapsed && <Logo size="sm" />}</SidebarGroupLabel>
          <div className={`flex items-center gap-3 px-3 py-3 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} />
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
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/tutor/dashboard'} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
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

export default function TutorAppliedJobs() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0, withdrawn: 0 });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (user) fetchApplications();
  }, [user, authLoading]);

  const fetchApplications = async () => {
    setLoading(true);
    const { data: tp } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!tp) { setLoading(false); return; }

    const { data: apps } = await supabase
      .from('applications')
      .select(`*, jobs(*, districts(name_en), subjects(name_en), profiles:parent_id(full_name, phone, email))`)
      .eq('tutor_id', tp.id)
      .order('created_at', { ascending: false });

    if (apps) {
      setApplications(apps as unknown as Application[]);
      setStats({
        total: apps.length,
        pending: apps.filter(a => a.status === 'pending').length,
        accepted: apps.filter(a => a.status === 'accepted').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        withdrawn: apps.filter(a => a.status === 'withdrawn').length,
      });
    }
    setLoading(false);
  };

  const withdrawApplication = async (appId: string) => {
    const { error } = await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', appId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Withdrawn', description: 'Application withdrawn successfully.' });
      fetchApplications();
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <TutorAppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-bold">My Applications</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Total', value: stats.total, color: 'text-foreground' },
                { label: 'Pending', value: stats.pending, color: 'text-warning' },
                { label: 'Accepted', value: stats.accepted, color: 'text-success' },
                { label: 'Rejected', value: stats.rejected, color: 'text-destructive' },
                { label: 'Withdrawn', value: stats.withdrawn, color: 'text-muted-foreground' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Applications list */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Applied Jobs
                </CardTitle>
                <CardDescription>Track all your job applications</CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length > 0 ? (
                  <Tabs defaultValue="all">
                    <TabsList className="mb-4 flex-wrap">
                      <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                      <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                      <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
                      <TabsTrigger value="withdrawn">Withdrawn ({stats.withdrawn})</TabsTrigger>
                    </TabsList>

                    {['all', 'pending', 'accepted', 'rejected', 'withdrawn'].map(tab => (
                      <TabsContent key={tab} value={tab} className="space-y-3">
                        {applications
                          .filter(a => tab === 'all' || a.status === tab)
                          .map(app => (
                            <div key={app.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <Link to={`/jobs/${app.jobs?.id}`} className="hover:text-primary">
                                    <h4 className="font-semibold mb-1 truncate">{app.jobs?.title}</h4>
                                  </Link>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
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
                                    <span>Budget: ৳{app.jobs?.budget_min}–{app.jobs?.budget_max}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">Your Rate: ৳{app.proposed_rate}/mo</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                    </span>
                                  </div>

                                  {app.status === 'accepted' && (
                                    <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                                      <p className="text-sm font-medium text-success">
                                        <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                                        You have been selected for this job. The guardian will contact you through the platform messaging system.
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
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
                                    <Button size="sm" variant="ghost" className="text-destructive h-8 text-xs" onClick={() => withdrawApplication(app.id)}>
                                      Withdraw
                                    </Button>
                                  )}
                                  <Link to={`/jobs/${app.jobs?.id}`}>
                                    <Button size="sm" variant="ghost" className="h-8"><Eye className="h-4 w-4" /></Button>
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
                      <Button>Browse Jobs <ArrowRight className="h-4 w-4 ml-2" /></Button>
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