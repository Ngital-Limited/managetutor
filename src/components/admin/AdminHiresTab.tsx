import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle, Eye, Plus, Search, DollarSign, Users, Briefcase } from 'lucide-react';
import { getPlatformCommissionPct, computeFeeSplit } from '@/lib/commission';

interface HireRow {
  id: string;
  job_id: string;
  application_id: string;
  parent_id: string;
  tutor_id: string;
  agreed_salary: number;
  start_date: string;
  subjects: string | null;
  days_per_week: number;
  guardian_confirmed: boolean;
  tutor_confirmed: boolean;
  status: string;
  commission_status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  tutor_name?: string;
  tutor_email?: string;
  job_title?: string;
  job_reference?: string;
}

export function AdminHiresTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [hires, setHires] = useState<HireRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedHire, setSelectedHire] = useState<HireRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [commissionPct, setCommissionPct] = useState(20);

  useEffect(() => { getPlatformCommissionPct().then(setCommissionPct); }, []);

  const fetchHires = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hiring_confirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading hires', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch related data
    const rows = data || [];
    const parentIds = [...new Set(rows.map((r: any) => r.parent_id))];
    const tutorIds = [...new Set(rows.map((r: any) => r.tutor_id))];
    const jobIds = [...new Set(rows.map((r: any) => r.job_id))];

    const [profilesRes, tutorProfilesRes, jobsRes] = await Promise.all([
      parentIds.length ? supabase.from('profiles').select('id, full_name, email, phone').in('id', parentIds) : { data: [] },
      tutorIds.length ? supabase.from('tutor_profiles').select('id, display_name, user_id, profiles:user_id(full_name, email)').in('id', tutorIds) : { data: [] },
      jobIds.length ? supabase.from('jobs').select('id, title, job_reference').in('id', jobIds) : { data: [] },
    ]);

    const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.id, p]));
    const tutorMap = Object.fromEntries((tutorProfilesRes.data || []).map((t: any) => [t.id, t]));
    const jobMap = Object.fromEntries((jobsRes.data || []).map((j: any) => [j.id, j]));

    const enriched: HireRow[] = rows.map((r: any) => {
      const parent = profileMap[r.parent_id];
      const tutor = tutorMap[r.tutor_id];
      const job = jobMap[r.job_id];
      return {
        ...r,
        parent_name: parent?.full_name || 'Unknown',
        parent_email: parent?.email,
        parent_phone: parent?.phone,
        tutor_name: tutor?.display_name || (tutor?.profiles as any)?.full_name || 'Unknown',
        tutor_email: (tutor?.profiles as any)?.email,
        job_title: job?.title || 'Unknown',
        job_reference: job?.job_reference,
      };
    });

    setHires(enriched);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchHires(); }, [fetchHires]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from('hiring_confirmations')
      .update({ status, admin_notes: adminNotes || undefined, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Hire ${status}` }); setSelectedHire(null); setAdminNotes(''); fetchHires(); }
    setProcessing(false);
  };

  const handleCreateCommission = async (hire: HireRow) => {
    setProcessing(true);
    const split = computeFeeSplit(hire.agreed_salary, commissionPct);
    const dueDate = hire.start_date ? new Date(new Date(hire.start_date).getTime() + 30 * 86400000).toISOString().split('T')[0] : null;

    const { error } = await supabase
      .from('commission_records' as any)
      .insert({
        hiring_confirmation_id: hire.id,
        tutor_id: hire.tutor_id,
        parent_id: hire.parent_id,
        job_id: hire.job_id,
        agreed_salary: hire.agreed_salary,
        commission_pct: commissionPct,
        commission_amount: split.platformCommission,
        amount_paid: 0,
        status: 'pending',
        due_date: dueDate,
      } as any);

    if (error) {
      toast({ title: 'Error creating commission', description: error.message, variant: 'destructive' });
    } else {
      // Update hire's commission_status
      await supabase.from('hiring_confirmations').update({ commission_status: 'invoiced' } as any).eq('id', hire.id);
      toast({ title: 'Commission record created' });
      fetchHires();
    }
    setProcessing(false);
  };

  const filtered = hires.filter(h => {
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (h.parent_name?.toLowerCase().includes(q) || h.tutor_name?.toLowerCase().includes(q) || h.job_reference?.toLowerCase().includes(q) || h.job_title?.toLowerCase().includes(q));
    }
    return true;
  });

  const statusBadge = (s: string) => {
    switch (s) {
      case 'pending_tutor': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pending Tutor</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Confirmed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Cancelled</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const commStatusBadge = (s: string) => {
    switch (s) {
      case 'pending': return <Badge variant="outline" className="bg-muted text-muted-foreground">No Invoice</Badge>;
      case 'invoiced': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Invoiced</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Paid</Badge>;
      case 'waived': return <Badge variant="outline" className="bg-muted text-muted-foreground">Waived</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const totalConfirmed = hires.filter(h => h.status === 'confirmed').length;
  const pendingTutor = hires.filter(h => h.status === 'pending_tutor').length;
  const totalSalary = hires.filter(h => h.status === 'confirmed').reduce((s, h) => s + h.agreed_salary, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Confirmed Hires</p><p className="text-xl font-bold">{totalConfirmed}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Pending Tutor Confirmation</p><p className="text-xl font-bold">{pendingTutor}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Agreed Salary</p><p className="text-xl font-bold">৳{totalSalary.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, job ref…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_tutor">Pending Tutor</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hires found</TableCell></TableRow>
              ) : filtered.map(h => (
                <TableRow key={h.id}>
                  <TableCell>
                    <div className="text-xs font-medium">{h.job_reference}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{h.job_title}</div>
                  </TableCell>
                  <TableCell className="text-xs">{h.parent_name}</TableCell>
                  <TableCell className="text-xs">{h.tutor_name}</TableCell>
                  <TableCell className="text-right text-xs font-medium">৳{h.agreed_salary?.toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(h.status)}</TableCell>
                  <TableCell>{commStatusBadge(h.commission_status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatExactDate(h.created_at)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedHire(h); setAdminNotes(h.admin_notes || ''); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedHire} onOpenChange={(o) => { if (!o) setSelectedHire(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Hire Details</DialogTitle></DialogHeader>
          {selectedHire && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Job:</span> <span className="font-medium">{selectedHire.job_reference} — {selectedHire.job_title}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedHire.status)}</div>
                <div><span className="text-muted-foreground">Parent:</span> {selectedHire.parent_name}</div>
                <div><span className="text-muted-foreground">Tutor:</span> {selectedHire.tutor_name}</div>
                <div><span className="text-muted-foreground">Agreed Salary:</span> ৳{selectedHire.agreed_salary?.toLocaleString()}/mo</div>
                <div><span className="text-muted-foreground">Start Date:</span> {selectedHire.start_date || 'N/A'}</div>
                <div><span className="text-muted-foreground">Days/Week:</span> {selectedHire.days_per_week}</div>
                <div><span className="text-muted-foreground">Subjects:</span> {selectedHire.subjects || 'N/A'}</div>
              </div>

              {/* Commission Breakdown */}
              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1 text-xs">
                  <p className="font-semibold text-sm">Commission Breakdown</p>
                  <div className="flex justify-between"><span>Agreed Salary</span><span>৳{selectedHire.agreed_salary?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Platform Commission ({commissionPct}%)</span><span className="font-medium text-primary">৳{computeFeeSplit(selectedHire.agreed_salary, commissionPct).platformCommission.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Tutor Payout</span><span>৳{computeFeeSplit(selectedHire.agreed_salary, commissionPct).tutorPayout.toLocaleString()}</span></div>
                </CardContent>
              </Card>

              <div>
                <label className="text-xs text-muted-foreground">Admin Notes</label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} placeholder="Internal notes…" />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedHire.status === 'pending_tutor' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(selectedHire.id, 'confirmed')} disabled={processing}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm Hire
                  </Button>
                )}
                {selectedHire.commission_status === 'pending' && selectedHire.status === 'confirmed' && (
                  <Button size="sm" variant="outline" onClick={() => handleCreateCommission(selectedHire)} disabled={processing}>
                    <DollarSign className="h-3.5 w-3.5 mr-1" /> Create Commission
                  </Button>
                )}
                {selectedHire.status !== 'cancelled' && (
                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedHire.id, 'cancelled')} disabled={processing}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                )}
                {adminNotes !== (selectedHire.admin_notes || '') && (
                  <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(selectedHire.id, selectedHire.status)} disabled={processing}>
                    Save Notes
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
