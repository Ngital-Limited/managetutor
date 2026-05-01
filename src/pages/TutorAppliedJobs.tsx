import { useState, useEffect } from 'react';
import { formatExactDate } from '@/lib/date';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import {
  Briefcase, Clock, CheckCircle2, XCircle, MapPin, BookOpen,
  Eye, ArrowRight, User, Phone, Mail,
  Star, Hourglass,
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
    profiles: { full_name: string } | null;
  };
}


export default function TutorAppliedJobs() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0, withdrawn: 0, shortlisted: 0, waiting: 0 });
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

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
      .select(`*, jobs(*, districts(name_en), subjects(name_en), profiles:parent_id(full_name))`)
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
        shortlisted: apps.filter(a => a.status === 'shortlisted').length,
        waiting: apps.filter(a => a.status === 'waiting').length,
      });
    }
    setLoading(false);
  };

  const confirmWithdraw = async () => {
    if (!withdrawId) return;
    setWithdrawing(true);
    const { error } = await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', withdrawId);
    setWithdrawing(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Withdrawn', description: 'Application withdrawn successfully.' });
      fetchApplications();
    }
    setWithdrawId(null);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <TutorSidebarLayout title="My Applications">
      <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
              {[
                { label: 'Total', value: stats.total, color: 'text-foreground' },
                { label: 'Pending', value: stats.pending, color: 'text-warning' },
                { label: 'Shortlisted', value: stats.shortlisted, color: 'text-primary' },
                { label: 'Waiting', value: stats.waiting, color: 'text-orange-500' },
                { label: 'Accepted', value: stats.accepted, color: 'text-success' },
                { label: 'Rejected', value: stats.rejected, color: 'text-destructive' },
                { label: 'Withdrawn', value: stats.withdrawn, color: 'text-muted-foreground' },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-3 text-center">
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
                    <TabsList className="mb-4 w-full sm:w-auto inline-flex sm:flex h-auto overflow-x-auto whitespace-nowrap justify-start sm:justify-center scrollbar-none">
                      <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                      <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                      <TabsTrigger value="shortlisted">Shortlisted ({stats.shortlisted})</TabsTrigger>
                      <TabsTrigger value="waiting">Waiting ({stats.waiting})</TabsTrigger>
                      <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
                      <TabsTrigger value="withdrawn">Withdrawn ({stats.withdrawn})</TabsTrigger>
                    </TabsList>

                    {['all', 'pending', 'shortlisted', 'waiting', 'accepted', 'rejected', 'withdrawn'].map(tab => (
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
                                      Applied {formatExactDate(new Date(app.created_at))}
                                    </span>
                                  </div>

                                   {app.status === 'shortlisted' && (
                                    <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                      <p className="text-sm font-medium text-primary">
                                        <Star className="h-3.5 w-3.5 inline mr-1" />
                                        You have been shortlisted for this job! The admin will review and finalize soon.
                                      </p>
                                    </div>
                                  )}
                                  {app.status === 'waiting' && (
                                    <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                      <p className="text-sm font-medium text-orange-600">
                                        <Hourglass className="h-3.5 w-3.5 inline mr-1" />
                                        Your application is in the waiting list. You will be notified of any updates.
                                      </p>
                                    </div>
                                  )}
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
                                    app.status === 'shortlisted' ? 'bg-primary' :
                                    app.status === 'waiting' ? 'bg-orange-500' :
                                    app.status === 'pending' ? 'bg-warning text-warning-foreground' : ''
                                  }>
                                    {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                    {app.status === 'shortlisted' && <Star className="h-3 w-3 mr-1" />}
                                    {app.status === 'waiting' && <Hourglass className="h-3 w-3 mr-1" />}
                                    {app.status === 'accepted' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                    {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                  </Badge>
                                  {app.status === 'pending' && (
                                    <Button size="sm" variant="ghost" className="text-destructive h-8 text-xs" onClick={() => setWithdrawId(app.id)}>
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
                    <Link to="/tutor/find-jobs">
                      <Button>Browse Jobs <ArrowRight className="h-4 w-4 ml-2" /></Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <AlertDialog open={!!withdrawId} onOpenChange={(open) => !open && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw this application? This action cannot be undone, and you will not be able to re-apply for the same job.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmWithdraw(); }}
              disabled={withdrawing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}