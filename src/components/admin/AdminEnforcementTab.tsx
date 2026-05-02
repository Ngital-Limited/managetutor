import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/adminLogger';
import { format } from 'date-fns';
import {
  Ban, ShieldAlert, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  DollarSign, MessageSquare, User, XCircle
} from 'lucide-react';

interface Props {
  toast: (opts: any) => void;
}

/* ─── Auto-Suspension Rules (manual trigger for now) ─── */
export function AdminEnforcementTab({ toast }: Props) {
  const { user } = useAuth();
  const [overdueRecords, setOverdueRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; tutorName: string; amount: number } | null>(null);

  const fetchOverdueTutors = useCallback(async () => {
    setLoading(true);
    // Find commission records that are overdue (past due_date and not fully paid)
    const { data } = await supabase
      .from('commission_records')
      .select('id, tutor_id, commission_amount, amount_paid, amount_due, due_date, status, job_id')
      .in('status', ['overdue', 'pending', 'partial'])
      .not('due_date', 'is', null)
      .lt('due_date', new Date().toISOString().slice(0, 10))
      .order('due_date', { ascending: true })
      .limit(100);

    if (data && data.length > 0) {
      const tutorIds = [...new Set(data.map(d => d.tutor_id))];
      const { data: tutors } = await supabase.from('tutor_profiles').select('id, user_id, display_name, is_available').in('id', tutorIds);
      const tutorUserIds = tutors?.map(t => t.user_id) || [];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, is_banned').in('id', tutorUserIds);
      const profMap = new Map(profs?.map(p => [p.id, p]) || []);
      const tutorMap = new Map(tutors?.map(t => [t.id, { ...t, profile: profMap.get(t.user_id) }]) || []);

      // Mark overdue if still pending
      for (const d of data) {
        if (d.status === 'pending') {
          await supabase.from('commission_records').update({ status: 'overdue' }).eq('id', d.id);
        }
      }

      setOverdueRecords(data.map(d => ({ ...d, tutor: tutorMap.get(d.tutor_id) })));
    } else {
      setOverdueRecords([]);
    }
    setLoading(false);
  }, []);

  const suspendTutor = async (record: any) => {
    const tutorUserId = record.tutor?.user_id;
    if (!tutorUserId) return;
    setSuspendingId(record.id);

    // Ban the profile
    await supabase.from('profiles').update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      banned_reason: `Auto-suspended: Overdue commission payment of ৳${record.amount_due || (record.commission_amount - record.amount_paid)}`,
    }).eq('id', tutorUserId);

    // Make tutor unavailable
    await supabase.from('tutor_profiles').update({ is_available: false }).eq('id', record.tutor_id);

    // Notify tutor
    await supabase.from('notifications').insert({
      user_id: tutorUserId,
      title: 'Account Suspended',
      message: `Your account has been suspended due to overdue commission payment. Please clear your dues to restore access.`,
      type: 'account_suspended',
      reference_id: record.id,
    });

    if (user) logAdminAction(user.id, 'suspend_tutor_overdue', 'user', tutorUserId, { commission_id: record.id });
    toast({ title: 'Tutor suspended', description: `${record.tutor?.profile?.full_name || 'Tutor'} has been suspended for overdue commission.` });
    setSuspendingId(null);
    setConfirmDialog(null);
    fetchOverdueTutors();
  };

  const daysOverdue = (dueDate: string) => {
    const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Enforcement & Suspensions</h1>
          <p className="text-sm text-muted-foreground">Manage overdue commission enforcement and account suspensions.</p>
        </div>
        <Button variant="outline" onClick={fetchOverdueTutors} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Scan Overdue
        </Button>
      </div>

      {/* Auto-suspension rules info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" /> Enforcement Rules</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Commissions past due date are automatically marked <Badge variant="outline" className="text-xs text-destructive">Overdue</Badge></p>
          <p>• Admin can suspend tutors with overdue payments using the table below</p>
          <p>• Suspended tutors are banned and made unavailable until dues are cleared</p>
          <p>• Use <strong>Commission Reminders</strong> to send payment reminders before suspending</p>
        </CardContent>
      </Card>

      {/* Overdue table */}
      {overdueRecords.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Due Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueRecords.map((r) => {
                  const dueAmt = r.amount_due || (r.commission_amount - r.amount_paid);
                  const days = daysOverdue(r.due_date);
                  const isBanned = r.tutor?.profile?.is_banned;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{r.tutor?.profile?.full_name || r.tutor?.display_name || '—'}</p>
                        {isBanned && <Badge variant="destructive" className="text-[10px] mt-0.5">Banned</Badge>}
                      </TableCell>
                      <TableCell className="font-medium text-destructive">৳{dueAmt?.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{r.due_date}</TableCell>
                      <TableCell>
                        <Badge variant={days > 30 ? 'destructive' : 'outline'} className="text-xs">
                          {days} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {!isBanned ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmDialog({ id: r.id, tutorName: r.tutor?.profile?.full_name || 'Tutor', amount: dueAmt })}
                            disabled={suspendingId === r.id}
                            className="text-xs"
                          >
                            <Ban className="h-3 w-3 mr-1" /> Suspend
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Already suspended</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : !loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Click "Scan Overdue" to find tutors with overdue commission payments.
          </CardContent>
        </Card>
      ) : null}

      {/* Confirmation dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" /> Confirm Suspension</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Are you sure you want to suspend <strong>{confirmDialog?.tutorName}</strong> for overdue commission of <strong>৳{confirmDialog?.amount?.toLocaleString()}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">This will ban their account and hide their profile until dues are cleared.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              const record = overdueRecords.find(r => r.id === confirmDialog?.id);
              if (record) suspendTutor(record);
            }}>
              Confirm Suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Commission Dispute Queue ─── */
export function AdminDisputeQueueTab({ toast }: Props) {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [resolveAction, setResolveAction] = useState<'waive' | 'reduce' | 'enforce'>('enforce');
  const [reduceAmount, setReduceAmount] = useState('');

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    // Look for commission records with waive_reason (dispute) or disputed status
    const { data } = await supabase
      .from('commission_records')
      .select('id, tutor_id, parent_id, job_id, commission_amount, amount_paid, amount_due, status, waive_reason, due_date, created_at')
      .or('status.eq.disputed,waive_reason.neq.')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const allUserIds = [...new Set([...data.map(d => d.tutor_id), ...data.map(d => d.parent_id)])];
      const { data: tutors } = await supabase.from('tutor_profiles').select('id, user_id, display_name').in('id', allUserIds.filter(Boolean));
      const tutorUserIds = tutors?.map(t => t.user_id) || [];
      const parentIds = data.map(d => d.parent_id).filter(Boolean);
      const profileIds = [...new Set([...tutorUserIds, ...parentIds])];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
      const profMap = new Map(profs?.map(p => [p.id, p]) || []);
      const tutorMap = new Map(tutors?.map(t => [t.id, { ...t, profile: profMap.get(t.user_id) }]) || []);

      setDisputes(data.map(d => ({
        ...d,
        tutor: tutorMap.get(d.tutor_id),
        parent: profMap.get(d.parent_id),
      })));
    } else {
      setDisputes([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const resolveDispute = async () => {
    if (!resolveDialog) return;
    const record = resolveDialog;

    if (resolveAction === 'waive') {
      await supabase.from('commission_records').update({
        status: 'waived',
        waive_reason: resolution || 'Waived by admin',
        amount_due: 0,
      }).eq('id', record.id);
    } else if (resolveAction === 'reduce') {
      const newAmount = parseInt(reduceAmount) || 0;
      await supabase.from('commission_records').update({
        commission_amount: newAmount,
        amount_due: Math.max(0, newAmount - (record.amount_paid || 0)),
        status: 'pending',
        waive_reason: `Reduced: ${resolution}`,
      }).eq('id', record.id);
    } else {
      await supabase.from('commission_records').update({
        status: record.amount_paid >= record.commission_amount ? 'paid' : 'pending',
        waive_reason: `Enforced: ${resolution}`,
      }).eq('id', record.id);
    }

    // Notify tutor
    if (record.tutor?.user_id) {
      await supabase.from('notifications').insert({
        user_id: record.tutor.user_id,
        title: 'Commission Dispute Resolved',
        message: `Your commission dispute has been resolved. Action: ${resolveAction}. ${resolution || ''}`.trim(),
        type: 'dispute_resolved',
        reference_id: record.id,
      });
    }

    if (user) logAdminAction(user.id, 'resolve_dispute', 'commission', record.id, { action: resolveAction, resolution });
    toast({ title: 'Dispute resolved', description: `Action: ${resolveAction}` });
    setResolveDialog(null);
    setResolution('');
    setReduceAmount('');
    fetchDisputes();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Commission Disputes</h1>
          <p className="text-sm text-muted-foreground">Review and resolve commission disputes.</p>
        </div>
        <Button variant="outline" onClick={fetchDisputes} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Clock className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : disputes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No commission disputes found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">{d.tutor?.profile?.full_name || '—'}</TableCell>
                    <TableCell className="text-sm">{d.parent?.full_name || '—'}</TableCell>
                    <TableCell className="text-sm font-medium">৳{d.commission_amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">৳{(d.amount_paid || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{d.waive_reason || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{d.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setResolveDialog(d)} className="text-xs">
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Resolve dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={resolveAction} onValueChange={(v) => setResolveAction(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enforce">Enforce Full Commission</SelectItem>
                  <SelectItem value="reduce">Reduce Commission Amount</SelectItem>
                  <SelectItem value="waive">Waive Entirely</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {resolveAction === 'reduce' && (
              <div>
                <label className="text-sm font-medium">New Commission Amount (৳)</label>
                <Input type="number" value={reduceAmount} onChange={(e) => setReduceAmount(e.target.value)} className="mt-1" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} className="mt-1" placeholder="Explain the resolution…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button onClick={resolveDispute}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
