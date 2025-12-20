import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, Shield, Users, Briefcase, CheckCircle2, XCircle, 
  Clock, AlertTriangle, BarChart3, FileText, Settings, Search,
  Eye, Ban, ChevronRight, TrendingUp, UserCheck, FileCheck
} from 'lucide-react';

interface TutorVerification {
  id: string;
  user_id: string;
  verification_status: string;
  created_at: string;
  profiles: { full_name: string; email: string };
  verification_documents: { id: string; document_type: string; document_url: string; status: string }[];
}

interface Report {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  reporter: { full_name: string };
  reported: { full_name: string; email: string };
}

interface Stats {
  totalTutors: number;
  pendingVerifications: number;
  activeJobs: number;
  totalMatches: number;
  pendingReports: number;
}

export default function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<Stats>({
    totalTutors: 0,
    pendingVerifications: 0,
    activeJobs: 0,
    totalMatches: 0,
    pendingReports: 0,
  });
  const [pendingTutors, setPendingTutors] = useState<TutorVerification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<TutorVerification | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'admin') {
        navigate('/dashboard');
        toast({ title: 'Access Denied', description: 'Admin access required', variant: 'destructive' });
      } else {
        fetchData();
      }
    }
  }, [user, role, loading, navigate]);

  const fetchData = async () => {
    // Fetch stats
    const [tutorsRes, jobsRes, pendingRes, reportsRes] = await Promise.all([
      supabase.from('tutor_profiles').select('id', { count: 'exact' }),
      supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'open'),
      supabase.from('tutor_profiles').select('id', { count: 'exact' }).eq('verification_status', 'pending'),
      supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
    ]);

    setStats({
      totalTutors: tutorsRes.count || 0,
      pendingVerifications: pendingRes.count || 0,
      activeJobs: jobsRes.count || 0,
      totalMatches: 0, // Would come from completed jobs
      pendingReports: reportsRes.count || 0,
    });

    // Fetch pending tutors with documents
    const { data: tutors } = await supabase
      .from('tutor_profiles')
      .select(`
        id, user_id, verification_status, created_at,
        profiles!inner (full_name, email),
        verification_documents (id, document_type, document_url, status)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (tutors) setPendingTutors(tutors as unknown as TutorVerification[]);

    // Fetch pending reports
    const { data: reportsData } = await supabase
      .from('reports')
      .select(`
        id, report_type, description, status, created_at,
        reporter:profiles!reports_reporter_id_fkey (full_name),
        reported:profiles!reports_reported_user_id_fkey (full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (reportsData) setReports(reportsData as unknown as Report[]);
  };

  const handleVerifyTutor = async (tutorId: string, status: 'approved' | 'rejected') => {
    setProcessing(true);
    
    const { error } = await supabase
      .from('tutor_profiles')
      .update({ 
        verification_status: status,
        verified_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', tutorId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Tutor ${status === 'approved' ? 'approved' : 'rejected'} successfully` });
      setSelectedTutor(null);
      fetchData();
    }
    setProcessing(false);
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed', banUser?: boolean) => {
    setProcessing(true);
    
    const { error } = await supabase
      .from('reports')
      .update({ 
        status,
        admin_notes: adminNotes,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      if (banUser && selectedReport) {
        await supabase
          .from('profiles')
          .update({ 
            is_banned: true,
            banned_at: new Date().toISOString(),
            banned_reason: adminNotes,
          })
          .eq('id', selectedReport.reported.full_name); // Need to get user ID properly
      }
      toast({ title: 'Success', description: `Report ${status}` });
      setSelectedReport(null);
      setAdminNotes('');
      fetchData();
    }
    setProcessing(false);
  };

  if (loading || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <Badge className="bg-destructive text-destructive-foreground">Admin</Badge>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Exit Admin</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Tutors', value: stats.totalTutors, icon: Users, color: 'text-tutor' },
            { label: 'Pending Verifications', value: stats.pendingVerifications, icon: Clock, color: 'text-warning' },
            { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, color: 'text-primary' },
            { label: 'Successful Matches', value: stats.totalMatches, icon: TrendingUp, color: 'text-success' },
            { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'text-destructive' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="verifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="verifications" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Verifications
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            <Card>
              <CardHeader>
                <CardTitle>Pending Tutor Verifications</CardTitle>
                <CardDescription>Review and approve tutor verification requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTutors.length > 0 ? (
                  <div className="space-y-4">
                    {pendingTutors.map((tutor) => (
                      <div key={tutor.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-tutor/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-tutor" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{tutor.profiles?.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{tutor.profiles?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <FileCheck className="h-3 w-3 mr-1" />
                                {tutor.verification_documents?.length || 0} documents
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedTutor(tutor)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-success hover:bg-success/90"
                            onClick={() => handleVerifyTutor(tutor.id, 'approved')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleVerifyTutor(tutor.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">No pending verifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>User Reports</CardTitle>
                <CardDescription>Review and handle user reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize">{report.report_type} Report</h4>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">{report.reported?.full_name}</span> reported by {report.reporter?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{report.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">No pending reports</h3>
                    <p className="text-muted-foreground">The community is safe!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Search and manage users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users by name or email..." className="pl-10" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                      <SelectItem value="tutor">Tutors</SelectItem>
                      <SelectItem value="agency">Agencies</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">Search</Button>
                </div>
                <p className="text-center text-muted-foreground py-8">Enter a search term to find users</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <CardDescription>Configure platform-wide settings</CardDescription>
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
                  <CardTitle>Subscription Plans</CardTitle>
                  <CardDescription>Manage tutor subscription plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Free', 'Standard', 'Premium', 'Pro'].map((plan) => (
                      <div key={plan} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{plan}</span>
                        <Button variant="ghost" size="sm">
                          Edit
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Review Report Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Report Type</label>
                  <p className="capitalize">{selectedReport.report_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reported User</label>
                  <p>{selectedReport.reported?.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-muted-foreground">{selectedReport.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea 
                    value={adminNotes} 
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this report..."
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleResolveReport(selectedReport!.id, 'dismissed')}
                disabled={processing}
              >
                Dismiss
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleResolveReport(selectedReport!.id, 'resolved', true)}
                disabled={processing}
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban User
              </Button>
              <Button 
                onClick={() => handleResolveReport(selectedReport!.id, 'resolved')}
                disabled={processing}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
