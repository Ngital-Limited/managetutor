import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationBell } from '@/components/NotificationBell';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/components/ui/sidebar';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  GraduationCap, Shield, Users, Briefcase, CheckCircle2, XCircle,
  Clock, AlertTriangle, BarChart3, FileText, Settings, Search,
  Eye, Ban, UserCheck, FileCheck,
  LogOut, Home, Star, DollarSign, Trash2, CreditCard, Megaphone, Send
} from 'lucide-react';

// ──────────── Types ────────────
interface Stats {
  totalUsers: number;
  totalTutors: number;
  totalParents: number;
  pendingVerifications: number;
  activeJobs: number;
  totalJobs: number;
  completedJobs: number;
  pendingReports: number;
  totalReviews: number;
  totalRevenue: number;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  created_at: string;
  role?: string;
}

interface TutorVerification {
  id: string;
  user_id: string;
  verification_status: string;
  education: string | null;
  experience_years: number;
  gender: string;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string | null };
  verification_documents: { id: string; document_type: string; document_url: string; status: string }[];
}

interface JobRow {
  id: string;
  title: string;
  job_reference: string | null;
  status: string;
  teaching_mode: string;
  total_applications: number;
  created_at: string;
  districts: { name_en: string };
  subjects: { name_en: string } | null;
  profiles: { full_name: string };
}

interface Report {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  reporter: { full_name: string };
  reported: { full_name: string; email: string };
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  parent: { full_name: string };
  tutor_profiles: { profiles: { full_name: string } };
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  transaction_id: string;
  created_at: string;
  completed_at: string | null;
  listing_type: string | null;
  profiles: { full_name: string; email: string };
}

// ──────────── Component ────────────
export default function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTutors: 0, totalParents: 0,
    pendingVerifications: 0, activeJobs: 0, totalJobs: 0, completedJobs: 0,
    pendingReports: 0, totalReviews: 0, totalRevenue: 0,
  });

  // Data states
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [pendingTutors, setPendingTutors] = useState<TutorVerification[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  // Dialog states
  const [selectedTutor, setSelectedTutor] = useState<TutorVerification | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate('/auth');
      else if (role !== 'admin') {
        navigate('/dashboard');
        toast({ title: 'Access Denied', description: 'Admin access required', variant: 'destructive' });
      } else {
        fetchStats();
      }
    }
  }, [user, role, loading]);

  const fetchStats = async () => {
    const [
      { count: totalUsers },
      { count: totalTutors },
      { count: totalParents },
      { count: pendingVerifications },
      { count: activeJobs },
      { count: totalJobs },
      { count: completedJobs },
      { count: pendingReports },
      { count: totalReviews },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('tutor_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
      supabase.from('tutor_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
    ]);

    const { data: rev } = await supabase.from('payment_transactions').select('amount').eq('status', 'completed');
    const totalRevenue = rev?.reduce((s, r) => s + Number(r.amount), 0) || 0;

    setStats({
      totalUsers: totalUsers || 0, totalTutors: totalTutors || 0, totalParents: totalParents || 0,
      pendingVerifications: pendingVerifications || 0, activeJobs: activeJobs || 0,
      totalJobs: totalJobs || 0, completedJobs: completedJobs || 0,
      pendingReports: pendingReports || 0, totalReviews: totalReviews || 0, totalRevenue,
    });
  };

  // ── Fetch functions per tab ──
  const fetchUsers = useCallback(async () => {
    let query = supabase.from('profiles').select('id, full_name, email, phone, avatar_url, is_banned, created_at').order('created_at', { ascending: false }).limit(100);
    if (userSearch) query = query.or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%,phone.ilike.%${userSearch}%`);
    const { data } = await query;
    if (!data) { setUsers([]); return; }

    // Fetch roles for these users
    const ids = data.map(u => u.id);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', ids);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    let result = data.map(u => ({ ...u, role: roleMap.get(u.id) || 'unknown' })) as UserRow[];
    if (userRoleFilter !== 'all') result = result.filter(u => u.role === userRoleFilter);
    setUsers(result);
  }, [userSearch, userRoleFilter]);

  const fetchVerifications = useCallback(async () => {
    const { data } = await supabase
      .from('tutor_profiles')
      .select('id, user_id, verification_status, education, experience_years, gender, created_at, profiles:user_id (full_name, email, phone), verification_documents (id, document_type, document_url, status)')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true }).limit(50);
    if (data) setPendingTutors(data as unknown as TutorVerification[]);
  }, []);

  const fetchJobs = useCallback(async () => {
    let query = supabase
      .from('jobs')
      .select('id, title, job_reference, status, teaching_mode, total_applications, created_at, districts (name_en), subjects (name_en), profiles:parent_id (full_name)')
      .order('created_at', { ascending: false }).limit(100);
    if (jobStatusFilter !== 'all') query = query.eq('status', jobStatusFilter as 'open' | 'in_progress' | 'completed' | 'cancelled');
    const { data } = await query;
    if (data) setJobs(data as unknown as JobRow[]);
  }, [jobStatusFilter]);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, report_type, description, status, created_at, reporter_id, reported_user_id, reporter:profiles!reports_reporter_id_fkey (full_name), reported:profiles!reports_reported_user_id_fkey (full_name, email)')
      .order('created_at', { ascending: false }).limit(50);
    if (data) setReports(data as unknown as Report[]);
  }, []);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, is_approved, created_at, parent:profiles!reviews_parent_id_fkey (full_name), tutor_profiles (profiles:user_id (full_name))')
      .order('created_at', { ascending: false }).limit(50);
    if (data) setReviews(data as unknown as ReviewRow[]);
  }, []);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from('payment_transactions')
      .select('id, amount, currency, status, transaction_id, created_at, completed_at, listing_type, profiles:user_id (full_name, email)')
      .order('created_at', { ascending: false }).limit(50);
    if (data) setPayments(data as unknown as PaymentRow[]);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (role !== 'admin') return;
    switch (activeTab) {
      case 'users': fetchUsers(); break;
      case 'verifications': fetchVerifications(); break;
      case 'jobs': fetchJobs(); break;
      case 'reports': fetchReports(); break;
      case 'reviews': fetchReviews(); break;
      case 'payments': fetchPayments(); break;
    }
  }, [activeTab, role, fetchUsers, fetchVerifications, fetchJobs, fetchReports, fetchReviews, fetchPayments]);

  // ── Actions ──
  const handleVerifyTutor = async (tutorId: string, status: 'approved' | 'rejected') => {
    setProcessing(true);
    const { error } = await supabase.from('tutor_profiles').update({
      verification_status: status,
      verified_at: status === 'approved' ? new Date().toISOString() : null,
    }).eq('id', tutorId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Success', description: `Tutor ${status}` });
      setSelectedTutor(null);
      fetchVerifications();
      fetchStats();
    }
    setProcessing(false);
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    setProcessing(true);
    const { error } = await supabase.from('profiles').update({
      is_banned: ban,
      banned_at: ban ? new Date().toISOString() : null,
      banned_reason: ban ? adminNotes : null,
    }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Success', description: `User ${ban ? 'banned' : 'unbanned'}` });
      setSelectedUser(null);
      setAdminNotes('');
      fetchUsers();
    }
    setProcessing(false);
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed', banUserId?: string) => {
    setProcessing(true);
    const { error } = await supabase.from('reports').update({
      status, admin_notes: adminNotes,
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', reportId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      if (banUserId) await handleBanUser(banUserId, true);
      toast({ title: 'Success', description: `Report ${status}` });
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
      fetchStats();
    }
    setProcessing(false);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Job deleted' }); fetchJobs(); fetchStats(); }
  };

  const handleToggleReview = async (reviewId: string, approved: boolean) => {
    const { error } = await supabase.from('reviews').update({ is_approved: approved }).eq('id', reviewId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Review ${approved ? 'approved' : 'hidden'}` }); fetchReviews(); }
  };

  const handleUpdateJobStatus = async (jobId: string, status: 'open' | 'in_progress' | 'completed' | 'cancelled') => {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Job status updated to ${status}` }); fetchJobs(); fetchStats(); }
  };

  if (loading || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sidebarItems = [
    { title: 'Overview', value: 'overview', icon: BarChart3 },
    { title: 'Users', value: 'users', icon: Users },
    { title: 'Verifications', value: 'verifications', icon: UserCheck, badge: stats.pendingVerifications },
    { title: 'Jobs', value: 'jobs', icon: Briefcase },
    { title: 'Reports', value: 'reports', icon: AlertTriangle, badge: stats.pendingReports },
    { title: 'Reviews', value: 'reviews', icon: Star },
    { title: 'Payments', value: 'payments', icon: CreditCard },
    { title: 'Broadcast', value: 'broadcast', icon: Megaphone },
    { title: 'Settings', value: 'settings', icon: Settings },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': case 'active': case 'approved': case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected': case 'cancelled': case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  <span className="font-bold">Admin Panel</span>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.value)}
                        className={`w-full justify-start ${activeTab === item.value ? 'bg-primary/10 text-primary font-semibold' : ''}`}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        <span className="flex-1 text-left">{item.title}</span>
                        {item.badge ? (
                          <Badge variant="destructive" className="ml-auto h-5 text-[10px]">{item.badge}</Badge>
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/" className="flex items-center gap-2 text-muted-foreground">
                        <Home className="h-4 w-4" />
                        <span>Back to Site</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold hidden sm:inline">Manage Tutor</span>
              <Badge variant="destructive" className="hidden sm:inline-flex">Super Admin</Badge>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={() => { supabase.auth.signOut(); navigate('/'); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8 overflow-auto">
            {/* ═══════ OVERVIEW TAB ═══════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Dashboard Overview</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
                    { label: 'Tutors', value: stats.totalTutors, icon: GraduationCap, color: 'text-tutor' },
                    { label: 'Parents', value: stats.totalParents, icon: Users, color: 'text-secondary' },
                    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-accent' },
                    { label: 'Completed Jobs', value: stats.completedJobs, icon: CheckCircle2, color: 'text-success' },
                    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: Clock, color: 'text-warning', action: () => setActiveTab('verifications') },
                    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-destructive', action: () => setActiveTab('reports') },
                    { label: 'Total Reviews', value: stats.totalReviews, icon: Star, color: 'text-accent' },
                    { label: 'Total Jobs', value: stats.totalJobs, icon: FileText, color: 'text-muted-foreground' },
                    { label: 'Revenue', value: `৳${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
                  ].map((stat, i) => (
                    <Card key={i} className={`cursor-pointer hover-lift ${stat.action ? 'border-warning/30' : ''}`} onClick={stat.action}>
                      <CardContent className="p-4">
                        <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Review Verifications', icon: UserCheck, action: () => setActiveTab('verifications'), count: stats.pendingVerifications },
                        { label: 'Handle Reports', icon: AlertTriangle, action: () => setActiveTab('reports'), count: stats.pendingReports },
                        { label: 'Manage Users', icon: Users, action: () => setActiveTab('users') },
                        { label: 'View Payments', icon: CreditCard, action: () => setActiveTab('payments') },
                      ].map((a, i) => (
                        <Button key={i} variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={a.action}>
                          <a.icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{a.label}</span>
                          {a.count ? <Badge variant="destructive">{a.count} pending</Badge> : null}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════ USERS TAB ═══════ */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">User Management</h1>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, email, or phone..." className="pl-10" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchUsers()} />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                      <SelectItem value="tutor">Tutors</SelectItem>
                      <SelectItem value="agency">Agencies</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchUsers}><Search className="h-4 w-4 mr-1" /> Search</Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Search users to see results</TableCell></TableRow>
                          ) : users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url || ''} />
                                    <AvatarFallback className="text-xs">{u.full_name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{u.full_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{u.phone || '—'}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize text-xs">{u.role}</Badge></TableCell>
                              <TableCell>
                                {u.is_banned ? (
                                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                                ) : (
                                  <Badge className="bg-success/10 text-success border-success/20 text-xs">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  {u.role === 'tutor' && (
                                    <Button variant="ghost" size="sm" asChild><Link to={`/tutor/${u.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setAdminNotes(''); }}>
                                    {u.is_banned ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════ VERIFICATIONS TAB ═══════ */}
            {activeTab === 'verifications' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Tutor Verifications</h1>
                {pendingTutors.length === 0 ? (
                  <Card><CardContent className="py-16 text-center">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">No pending verifications</p>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {pendingTutors.map((tutor) => (
                      <Card key={tutor.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-tutor/10 flex items-center justify-center">
                                <GraduationCap className="h-6 w-6 text-tutor" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{tutor.profiles?.full_name}</h4>
                                <p className="text-sm text-muted-foreground">{tutor.profiles?.email}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    <FileCheck className="h-3 w-3 mr-1" />
                                    {tutor.verification_documents?.length || 0} docs
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">{tutor.gender}</Badge>
                                  {tutor.education && <Badge variant="outline" className="text-xs">{tutor.education}</Badge>}
                                  <Badge variant="outline" className="text-xs">{tutor.experience_years} yrs exp</Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => setSelectedTutor(tutor)}>
                                <Eye className="h-4 w-4 mr-1" /> Review
                              </Button>
                              <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleVerifyTutor(tutor.id, 'approved')} disabled={processing}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleVerifyTutor(tutor.id, 'rejected')} disabled={processing}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════ JOBS TAB ═══════ */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-extrabold">Job Management</h1>
                  <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reference</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Posted By</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Apps</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Posted</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobs.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
                          ) : jobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-mono text-xs">{job.job_reference || '—'}</TableCell>
                              <TableCell className="font-medium text-sm max-w-[200px] truncate">{job.title}</TableCell>
                              <TableCell className="text-sm">{(job.profiles as any)?.full_name}</TableCell>
                              <TableCell className="text-sm">{(job.districts as any)?.name_en}</TableCell>
                              <TableCell className="text-sm">{(job.subjects as any)?.name_en || '—'}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-xs">{job.total_applications}</Badge></TableCell>
                              <TableCell><Badge className={`text-xs capitalize ${statusColor(job.status)}`}>{job.status}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button variant="ghost" size="sm" asChild><Link to={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                  {job.status === 'open' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleUpdateJobStatus(job.id, 'cancelled')}>
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════ REPORTS TAB ═══════ */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">User Reports</h1>
                {reports.length === 0 ? (
                  <Card><CardContent className="py-16 text-center">
                    <Shield className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">No reports</h3>
                    <p className="text-muted-foreground">The community is safe!</p>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <Card key={report.id} className={report.status === 'pending' ? 'border-warning/30' : ''}>
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.status === 'pending' ? 'bg-destructive/10' : 'bg-muted'}`}>
                                <AlertTriangle className={`h-6 w-6 ${report.status === 'pending' ? 'text-destructive' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold capitalize">{report.report_type} Report</h4>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">{report.reported?.full_name}</span> reported by {report.reporter?.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs capitalize ${statusColor(report.status)}`}>{report.status}</Badge>
                              {report.status === 'pending' && (
                                <Button variant="outline" size="sm" onClick={() => { setSelectedReport(report); setAdminNotes(''); }}>
                                  <Eye className="h-4 w-4 mr-1" /> Review
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════ REVIEWS TAB ═══════ */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Review Moderation</h1>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parent</TableHead>
                            <TableHead>Tutor</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reviews.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reviews yet</TableCell></TableRow>
                          ) : reviews.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm">{(r.parent as any)?.full_name}</TableCell>
                              <TableCell className="text-sm">{(r.tutor_profiles as any)?.profiles?.full_name || '—'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                                  <span className="text-sm font-medium">{r.rating}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm max-w-[250px] truncate">{r.comment || '—'}</TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${r.is_approved ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                  {r.is_approved ? 'Visible' : 'Hidden'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleToggleReview(r.id, !r.is_approved)}>
                                  {r.is_approved ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════ PAYMENTS TAB ═══════ */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Payment Transactions</h1>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
                          ) : payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.transaction_id}</TableCell>
                              <TableCell className="text-sm">{(p.profiles as any)?.full_name}</TableCell>
                              <TableCell className="text-sm font-semibold">৳{Number(p.amount).toLocaleString()}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs capitalize">{p.listing_type || 'subscription'}</Badge></TableCell>
                              <TableCell><Badge className={`text-xs capitalize ${statusColor(p.status)}`}>{p.status}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════ SETTINGS TAB ═══════ */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Platform Settings</h1>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Commission & Pricing</CardTitle>
                      <CardDescription>Configure platform fees</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Commission Rate (%)</label>
                        <Input type="number" defaultValue="10" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Featured Tutor Daily Rate (৳)</label>
                        <Input type="number" defaultValue="50" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Featured Job Daily Rate (৳)</label>
                        <Input type="number" defaultValue="30" className="mt-1" />
                      </div>
                      <Button className="w-full">Save Settings</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Info</CardTitle>
                      <CardDescription>Current system status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Total Users', value: stats.totalUsers },
                        { label: 'Total Tutors', value: stats.totalTutors },
                        { label: 'Total Parents', value: stats.totalParents },
                        { label: 'Active Jobs', value: stats.activeJobs },
                        { label: 'Total Revenue', value: `৳${stats.totalRevenue.toLocaleString()}` },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ═══════ DIALOGS ═══════ */}

      {/* Review Tutor Dialog */}
      <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Tutor Verification</DialogTitle></DialogHeader>
          {selectedTutor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">Name</label><p className="font-semibold">{selectedTutor.profiles?.full_name}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Email</label><p className="text-sm">{selectedTutor.profiles?.email}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Gender</label><p className="capitalize">{selectedTutor.gender}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Experience</label><p>{selectedTutor.experience_years} years</p></div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground">Education</label><p>{selectedTutor.education || 'Not provided'}</p></div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Uploaded Documents</label>
                {selectedTutor.verification_documents?.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedTutor.verification_documents.map((doc) => (
                      <a key={doc.id} href={doc.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm capitalize">{doc.document_type}</span>
                        <Badge variant="outline" className="ml-auto text-xs capitalize">{doc.status}</Badge>
                      </a>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground mt-1">No documents uploaded</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleVerifyTutor(selectedTutor!.id, 'rejected')} disabled={processing}>Reject</Button>
            <Button className="bg-success hover:bg-success/90" onClick={() => handleVerifyTutor(selectedTutor!.id, 'approved')} disabled={processing}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedUser?.is_banned ? 'Unban User' : 'Ban User'}</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">User</label>
                <p className="font-semibold">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              {!selectedUser.is_banned && (
                <div>
                  <label className="text-sm font-medium">Reason for ban</label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Why is this user being banned?" className="mt-1" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
            <Button variant={selectedUser?.is_banned ? 'default' : 'destructive'} onClick={() => handleBanUser(selectedUser!.id, !selectedUser!.is_banned)} disabled={processing}>
              {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Report</DialogTitle></DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">Type</label><p className="capitalize">{selectedReport.report_type}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Status</label><Badge className={`capitalize ${statusColor(selectedReport.status)}`}>{selectedReport.status}</Badge></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Reported User</label><p className="font-semibold">{selectedReport.reported?.full_name}</p><p className="text-sm text-muted-foreground">{selectedReport.reported?.email}</p></div>
              <div><label className="text-xs font-medium text-muted-foreground">Reporter</label><p>{selectedReport.reporter?.full_name}</p></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedReport.description}</p></div>
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes about this report..." className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => handleResolveReport(selectedReport!.id, 'dismissed')} disabled={processing}>Dismiss</Button>
            <Button variant="destructive" onClick={() => handleResolveReport(selectedReport!.id, 'resolved', selectedReport!.reported_user_id)} disabled={processing}>
              <Ban className="h-4 w-4 mr-2" /> Ban & Resolve
            </Button>
            <Button onClick={() => handleResolveReport(selectedReport!.id, 'resolved')} disabled={processing}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
