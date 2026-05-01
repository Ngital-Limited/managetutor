import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, Bell, Search, Percent, Ban } from 'lucide-react';

interface CommissionRow {
  id: string;
  hiring_confirmation_id: string;
  tutor_id: string;
  parent_id: string;
  job_id: string;
  agreed_salary: number;
  commission_pct: number;
  commission_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  due_date: string | null;
  waive_reason: string | null;
  created_at: string;
  tutor_name?: string;
  parent_name?: string;
  job_reference?: string;
  job_title?: string;
}

interface PaymentRow {
  id: string;
  commission_id: string;
  amount: number;
  payment_method: string;
  payment_reference: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
}

export function AdminCommissionTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CommissionRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [processing, setProcessing] = useState(false);

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bkash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Waive form
  const [showWaiveForm, setShowWaiveForm] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('commission_records' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const rows = (data || []) as any[];
    const tutorIds = [...new Set(rows.map(r => r.tutor_id))];
    const parentIds = [...new Set(rows.map(r => r.parent_id))];
    const jobIds = [...new Set(rows.map(r => r.job_id))];

    const [tutorRes, parentRes, jobRes] = await Promise.all([
      tutorIds.length ? supabase.from('tutor_profiles').select('id, display_name, user_id, profiles:user_id(full_name)').in('id', tutorIds) : { data: [] },
      parentIds.length ? supabase.from('profiles').select('id, full_name').in('id', parentIds) : { data: [] },
      jobIds.length ? supabase.from('jobs').select('id, title, job_reference').in('id', jobIds) : { data: [] },
    ]);

    const tutorMap = Object.fromEntries((tutorRes.data || []).map((t: any) => [t.id, t]));
    const parentMap = Object.fromEntries((parentRes.data || []).map((p: any) => [p.id, p]));
    const jobMap = Object.fromEntries((jobRes.data || []).map((j: any) => [j.id, j]));

    const enriched: CommissionRow[] = rows.map(r => {
      const tutor = tutorMap[r.tutor_id];
      const parent = parentMap[r.parent_id];
      const job = jobMap[r.job_id];
      return {
        ...r,
        tutor_name: tutor?.display_name || (tutor?.profiles as any)?.full_name || 'Unknown',
        parent_name: parent?.full_name || 'Unknown',
        job_reference: job?.job_reference,
        job_title: job?.title,
      };
    });

    setCommissions(enriched);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

  const fetchPayments = async (commissionId: string) => {
    const { data } = await supabase
      .from('commission_payments' as any)
      .select('*')
      .eq('commission_id', commissionId)
      .order('payment_date', { ascending: false });
    setPayments((data || []) as any[]);
  };

  const handleSelectCommission = (c: CommissionRow) => {
    setSelected(c);
    fetchPayments(c.id);
    setShowPaymentForm(false);
    setShowWaiveForm(false);
  };

  const handleRecordPayment = async () => {
    if (!selected || !payAmount) return;
    setProcessing(true);
    const amount = parseInt(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      setProcessing(false);
      return;
    }

    const { error } = await supabase
      .from('commission_payments' as any)
      .insert({
        commission_id: selected.id,
        amount,
        payment_method: payMethod,
        payment_reference: payRef || null,
        received_by: user?.id,
        notes: payNotes || null,
        payment_date: payDate,
      } as any);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update commission record
      const newPaid = selected.amount_paid + amount;
      const newStatus = newPaid >= selected.commission_amount ? 'paid' : 'partial';
      await supabase
        .from('commission_records' as any)
        .update({ amount_paid: newPaid, status: newStatus } as any)
        .eq('id', selected.id);

      // Update hiring confirmation commission_status
      if (newStatus === 'paid') {
        await supabase.from('hiring_confirmations').update({ commission_status: 'paid' } as any).eq('id', selected.hiring_confirmation_id);
      }

      toast({ title: 'Payment recorded' });
      setPayAmount(''); setPayRef(''); setPayNotes(''); setShowPaymentForm(false);
      fetchCommissions();
      fetchPayments(selected.id);
    }
    setProcessing(false);
  };

  const handleWaive = async () => {
    if (!selected) return;
    setProcessing(true);
    const { error } = await supabase
      .from('commission_records' as any)
      .update({ status: 'waived', waive_reason: waiveReason } as any)
      .eq('id', selected.id);

    if (!error) {
      await supabase.from('hiring_confirmations').update({ commission_status: 'waived' } as any).eq('id', selected.hiring_confirmation_id);
      toast({ title: 'Commission waived' });
      setSelected(null); setShowWaiveForm(false); setWaiveReason('');
      fetchCommissions();
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleSendReminder = async (c: CommissionRow) => {
    // Find tutor user_id
    const { data: tp } = await supabase.from('tutor_profiles').select('user_id').eq('id', c.tutor_id).maybeSingle();
    if (!tp) { toast({ title: 'Tutor not found', variant: 'destructive' }); return; }

    await supabase.from('notifications').insert({
      user_id: tp.user_id,
      title: 'Commission Payment Reminder',
      message: `Your commission of ৳${c.amount_due.toLocaleString()} for job ${c.job_reference || ''} is due. Please arrange payment.`,
      type: 'commission_reminder',
      reference_id: c.job_id,
    });
    toast({ title: 'Reminder sent to tutor' });
  };

  const filtered = commissions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.tutor_name?.toLowerCase().includes(q) || c.parent_name?.toLowerCase().includes(q) || c.job_reference?.toLowerCase().includes(q));
    }
    return true;
  });

  const totalOwed = commissions.filter(c => c.status !== 'waived').reduce((s, c) => s + c.commission_amount, 0);
  const totalCollected = commissions.reduce((s, c) => s + c.amount_paid, 0);
  const overdue = commissions.filter(c => c.status === 'pending' && c.due_date && new Date(c.due_date) < new Date()).length;

  const statusBadge = (s: string) => {
    switch (s) {
      case 'pending': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case 'partial': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Partial</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Paid</Badge>;
      case 'waived': return <Badge variant="outline" className="bg-muted text-muted-foreground">Waived</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Owed</p><p className="text-xl font-bold">৳{totalOwed.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-xl font-bold">৳{totalCollected.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-bold">৳{(totalOwed - totalCollected).toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold">{overdue}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tutor, parent, job ref…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
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
                <TableHead>Tutor</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No commission records</TableCell></TableRow>
              ) : filtered.map(c => {
                const isOverdue = c.status === 'pending' && c.due_date && new Date(c.due_date) < new Date();
                return (
                  <TableRow key={c.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      <div className="text-xs font-medium">{c.job_reference}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">{c.job_title}</div>
                    </TableCell>
                    <TableCell className="text-xs">{c.tutor_name}</TableCell>
                    <TableCell className="text-right text-xs">৳{c.agreed_salary?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-medium">৳{c.commission_amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs text-success">৳{c.amount_paid?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs font-medium">৳{c.amount_due?.toLocaleString()}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.due_date ? format(new Date(c.due_date), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSelectCommission(c)} title="View Details">
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                        {(c.status === 'pending' || c.status === 'partial') && (
                          <Button size="sm" variant="ghost" onClick={() => handleSendReminder(c)} title="Send Reminder">
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setShowPaymentForm(false); setShowWaiveForm(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Commission Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Tutor:</span> {selected.tutor_name}</div>
                <div><span className="text-muted-foreground">Parent:</span> {selected.parent_name}</div>
                <div><span className="text-muted-foreground">Job:</span> {selected.job_reference}</div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selected.status)}</div>
                <div><span className="text-muted-foreground">Salary:</span> ৳{selected.agreed_salary?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Commission ({selected.commission_pct}%):</span> ৳{selected.commission_amount?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Paid:</span> <span className="text-success">৳{selected.amount_paid?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Remaining:</span> <span className="font-semibold">৳{selected.amount_due?.toLocaleString()}</span></div>
              </div>

              {/* Payment History */}
              {payments.length > 0 && (
                <div>
                  <p className="font-semibold text-xs mb-1">Payment History</p>
                  <div className="border rounded-md divide-y text-xs">
                    {payments.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-2">
                        <div>
                          <span className="font-medium">৳{p.amount.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-2">{p.payment_method}</span>
                          {p.payment_reference && <span className="text-muted-foreground ml-1">({p.payment_reference})</span>}
                        </div>
                        <span className="text-muted-foreground">{format(new Date(p.payment_date), 'dd MMM yyyy')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Record Payment Form */}
              {showPaymentForm && selected.status !== 'paid' && selected.status !== 'waived' && (
                <Card className="bg-muted/30">
                  <CardContent className="p-3 space-y-3">
                    <p className="font-semibold text-xs">Record Payment</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Amount (৳)</Label>
                        <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Max: ${selected.amount_due}`} />
                      </div>
                      <div>
                        <Label className="text-xs">Method</Label>
                        <Select value={payMethod} onValueChange={setPayMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bkash">bKash</SelectItem>
                            <SelectItem value="nagad">Nagad</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Reference #</Label>
                        <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="TXN ID" />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleRecordPayment} disabled={processing || !payAmount}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save Payment
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Waive Form */}
              {showWaiveForm && selected.status !== 'paid' && selected.status !== 'waived' && (
                <Card className="bg-destructive/5">
                  <CardContent className="p-3 space-y-2">
                    <p className="font-semibold text-xs">Waive Commission</p>
                    <Textarea value={waiveReason} onChange={e => setWaiveReason(e.target.value)} rows={2} placeholder="Reason for waiving…" />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleWaive} disabled={processing || !waiveReason}>
                        <Ban className="h-3.5 w-3.5 mr-1" /> Confirm Waive
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowWaiveForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selected.status !== 'paid' && selected.status !== 'waived' && (
                  <>
                    <Button size="sm" onClick={() => { setShowPaymentForm(true); setShowWaiveForm(false); }} disabled={showPaymentForm}>
                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Record Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSendReminder(selected)}>
                      <Bell className="h-3.5 w-3.5 mr-1" /> Send Reminder
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setShowWaiveForm(true); setShowPaymentForm(false); }} disabled={showWaiveForm}>
                      <Ban className="h-3.5 w-3.5 mr-1" /> Waive
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
