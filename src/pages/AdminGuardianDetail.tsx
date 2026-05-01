import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AdminNotesWidget } from '@/components/admin/AdminNotesWidget';
import { logAdminAction } from '@/lib/adminLogger';
import {
  ArrowLeft, UserCheck, Ban, Phone, Mail, MapPin, Calendar, Briefcase,
  CheckCircle2, Clock, DollarSign, Activity, FileText
} from 'lucide-react';

export default function AdminGuardianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [hires, setHires] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [profileRes, roleRes, jobsRes, hiresRes, commissionsRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*, districts:district_id(name_en), areas:area_id(name_en)').eq('id', id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', id).maybeSingle(),
      supabase.from('jobs').select('id, title, job_reference, status, total_applications, created_at, district_id, districts:district_id(name_en)').eq('parent_id', id).order('created_at', { ascending: false }),
      supabase.from('hiring_confirmations').select('*, tutor_profiles:tutor_id(display_name, profiles:user_id(full_name)), jobs:job_id(title, job_reference)').eq('parent_id', id).order('created_at', { ascending: false }),
      supabase.from('commission_records' as any).select('*').eq('parent_id', id).order('created_at', { ascending: false }),
      supabase.from('activity_logs' as any).select('*').eq('target_id', id).order('created_at', { ascending: false }).limit(50),
    ]);

    setProfile(profileRes.data);
    setRole((roleRes.data as any)?.role || 'parent');
    setJobs(jobsRes.data || []);
    setHires(hiresRes.data || []);
    setCommissions((commissionsRes.data || []) as any[]);
    setActivityLogs((logsRes.data || []) as any[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async () => {
    if (!id || !user) return;
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    logAdminAction(user.id, 'user_approved', 'user', id);
    toast({ title: 'User approved' });
    fetchData();
  };

  const handleBan = async (ban: boolean) => {
    if (!id || !user) return;
    await supabase.from('profiles').update({
      is_banned: ban, banned_at: ban ? new Date().toISOString() : null,
    }).eq('id', id);
    logAdminAction(user.id, ban ? 'user_banned' : 'user_unbanned', 'user', id);
    toast({ title: ban ? 'User banned' : 'User unbanned' });
    fetchData();
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 text-center py-20">
        <p className="text-muted-foreground">Guardian not found</p>
        <Button variant="ghost" onClick={() => navigate('/admin?tab=guardians')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Guardians
        </Button>
      </div>
    );
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case 'open': case 'approved': return <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">{s}</Badge>;
      case 'pending_approval': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">Pending</Badge>;
      case 'closed': case 'cancelled': return <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">{s}</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
  };

  const totalCommission = commissions.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
  const totalPaid = commissions.reduce((s: number, c: any) => s + (c.amount_paid || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=guardians')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Guardian Detail</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback>{profile.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{profile.full_name}</h2>
                {profile.user_reference && <Badge variant="outline" className="text-[10px] font-mono">{profile.user_reference}</Badge>}
                {profile.is_banned ? (
                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                ) : profile.is_approved ? (
                  <Badge className="bg-success/10 text-success border-success/20 text-xs">Approved</Badge>
                ) : (
                  <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pending</Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{profile.email}</div>
                <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone || 'No phone'}</div>
                <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(profile.districts as any)?.name_en || 'No district'}{(profile.areas as any)?.name_en ? `, ${(profile.areas as any).name_en}` : ''}</div>
                <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {formatExactDate(profile.created_at)}</div>
              </div>
            </div>
            <div className="flex gap-2 self-start">
              {!profile.is_approved && !profile.is_banned && (
                <Button size="sm" onClick={handleApprove}><UserCheck className="h-3.5 w-3.5 mr-1" /> Approve</Button>
              )}
              <Button size="sm" variant={profile.is_banned ? 'outline' : 'destructive'} onClick={() => handleBan(!profile.is_banned)}>
                {profile.is_banned ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Unban</> : <><Ban className="h-3.5 w-3.5 mr-1" /> Ban</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{jobs.length}</p>
          <p className="text-xs text-muted-foreground">Jobs Posted</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{hires.length}</p>
          <p className="text-xs text-muted-foreground">Hires</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">৳{totalCommission.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Commission</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-success">৳{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Collected</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="jobs">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="jobs" className="text-xs"><Briefcase className="h-3 w-3 mr-1" /> Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="hires" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Hires ({hires.length})</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs"><DollarSign className="h-3 w-3 mr-1" /> Finance ({commissions.length})</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Notes</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs"><Activity className="h-3 w-3 mr-1" /> Activity</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Apps</TableHead>
                    <TableHead>Posted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No jobs posted</TableCell></TableRow>
                  ) : jobs.map(j => (
                    <TableRow key={j.id}>
                      <TableCell className="text-xs font-mono">{j.job_reference}</TableCell>
                      <TableCell className="text-xs">{j.title}</TableCell>
                      <TableCell className="text-xs">{(j.districts as any)?.name_en || '—'}</TableCell>
                      <TableCell>{statusBadge(j.status)}</TableCell>
                      <TableCell className="text-xs">{j.total_applications}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatExactDate(j.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Hires Tab */}
        <TabsContent value="hires">
          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hires.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No hires</TableCell></TableRow>
                  ) : hires.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{(h.jobs as any)?.job_reference || '—'}</TableCell>
                      <TableCell className="text-xs">{(h.tutor_profiles as any)?.display_name || (h.tutor_profiles?.profiles as any)?.full_name || '—'}</TableCell>
                      <TableCell className="text-right text-xs">৳{h.agreed_salary?.toLocaleString()}</TableCell>
                      <TableCell>{statusBadge(h.status)}</TableCell>
                      <TableCell className="text-xs">{h.start_date || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatExactDate(h.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance">
          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salary</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No commission records</TableCell></TableRow>
                  ) : commissions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">৳{c.agreed_salary?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-medium">৳{c.commission_amount?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-success">৳{c.amount_paid?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-medium">৳{c.amount_due?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${c.status === 'paid' ? 'bg-success/10 text-success' : c.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.due_date || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="p-4">
              <AdminNotesWidget targetUserId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">No activity recorded</TableCell></TableRow>
                  ) : activityLogs.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatExactDate(l.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{l.action?.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                        {Object.keys(l.details || {}).length > 0 ? JSON.stringify(l.details) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
