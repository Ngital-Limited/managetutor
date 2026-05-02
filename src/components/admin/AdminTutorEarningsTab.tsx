import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, RefreshCw, Download, DollarSign, Users, TrendingUp, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatExactDate } from '@/lib/date';

interface TutorEarning {
  tutor_id: string;
  user_id: string;
  display_name: string;
  full_name: string;
  email: string;
  total_hires: number;
  total_commission_due: number;
  total_commission_paid: number;
  outstanding: number;
}

export function AdminTutorEarningsTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [earnings, setEarnings] = useState<TutorEarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [detailTutor, setDetailTutor] = useState<TutorEarning | null>(null);
  const [detailRecords, setDetailRecords] = useState<any[]>([]);
  const [detailPayments, setDetailPayments] = useState<any[]>([]);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    // Get all tutors with their commission records and payments
    const { data: tutors } = await supabase
      .from('tutor_profiles')
      .select('id, user_id, display_name, profiles:user_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (!tutors || tutors.length === 0) { setEarnings([]); setLoading(false); return; }

    const tutorIds = tutors.map(t => t.id);

    const [{ data: records }, { data: payments }] = await Promise.all([
      supabase.from('commission_records').select('id, tutor_id, commission_amount, status, amount_paid').in('tutor_id', tutorIds),
      supabase.from('commission_payments').select('commission_id, amount').limit(1000),
    ]);

    const commMap = new Map<string, { due: number; count: number }>();
    // Build a map from commission_id -> tutor_id
    const commToTutor = new Map<string, string>();

    (records || []).forEach(r => {
      const curr = commMap.get(r.tutor_id) || { due: 0, count: 0 };
      curr.due += r.commission_amount || 0;
      curr.count += 1;
      commMap.set(r.tutor_id, curr);
      commToTutor.set(r.id, r.tutor_id);
    });

    const paidMap = new Map<string, number>();
    (payments || []).forEach((p: any) => {
      const tutorId = commToTutor.get(p.commission_id);
      if (tutorId) paidMap.set(tutorId, (paidMap.get(tutorId) || 0) + (p.amount || 0));
    });

    const result: TutorEarning[] = tutors
      .map(t => {
        const comm = commMap.get(t.id) || { due: 0, count: 0 };
        const paid = paidMap.get(t.id) || 0;
        return {
          tutor_id: t.id,
          user_id: t.user_id,
          display_name: t.display_name || '',
          full_name: (t.profiles as any)?.full_name || '',
          email: (t.profiles as any)?.email || '',
          total_hires: comm.count,
          total_commission_due: comm.due,
          total_commission_paid: paid,
          outstanding: Math.max(0, comm.due - paid),
        };
      })
      .filter(t => t.total_hires > 0 || t.total_commission_due > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    setEarnings(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const openDetail = async (tutor: TutorEarning) => {
    setDetailTutor(tutor);
    const [{ data: recs }, { data: pays }] = await Promise.all([
      supabase.from('commission_records').select('*').eq('tutor_id', tutor.tutor_id).order('created_at', { ascending: false }),
      supabase.from('commission_payments').select('*').eq('tutor_id', tutor.tutor_id).order('created_at', { ascending: false }),
    ]);
    setDetailRecords(recs || []);
    setDetailPayments(pays || []);
  };

  const filtered = earnings.filter(e => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return e.full_name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.display_name.toLowerCase().includes(s);
  });

  const totals = {
    due: filtered.reduce((s, e) => s + e.total_commission_due, 0),
    paid: filtered.reduce((s, e) => s + e.total_commission_paid, 0),
    outstanding: filtered.reduce((s, e) => s + e.outstanding, 0),
  };

  const exportCSV = () => {
    const rows = filtered.map(e => ({
      Name: e.full_name || e.display_name,
      Email: e.email,
      Hires: e.total_hires,
      'Commission Due': e.total_commission_due,
      'Commission Paid': e.total_commission_paid,
      Outstanding: e.outstanding,
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tutor-earnings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Tutor earnings exported as CSV' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tutor Earnings</h1>
          <p className="text-sm text-muted-foreground">Per-tutor financial summary — commissions due, paid, and outstanding</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={fetchEarnings}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Total Commission Due</div>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-1">৳{totals.due.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Total Paid</div>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">৳{totals.paid.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <Users className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold mt-1 text-destructive">৳{totals.outstanding.toLocaleString()}</div>
        </CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tutor name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-center">Hires</TableHead>
                  <TableHead className="text-right">Commission Due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No earnings data found</TableCell></TableRow>
                ) : filtered.map(e => (
                  <TableRow key={e.tutor_id}>
                    <TableCell>
                      <div className="text-sm font-medium">{e.full_name || e.display_name}</div>
                      <div className="text-xs text-muted-foreground">{e.email}</div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{e.total_hires}</TableCell>
                    <TableCell className="text-right">৳{e.total_commission_due.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600">৳{e.total_commission_paid.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {e.outstanding > 0 ? (
                        <Badge variant="destructive" className="text-xs">৳{e.outstanding.toLocaleString()}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Settled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openDetail(e)}>
                        <Eye className="h-3 w-3" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!detailTutor} onOpenChange={() => setDetailTutor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTutor?.full_name || detailTutor?.display_name} — Financial Detail</DialogTitle>
          </DialogHeader>
          {detailTutor && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">Commission Records ({detailRecords.length})</h3>
                {detailRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No commission records</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRecords.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{formatExactDate(new Date(r.created_at))}</TableCell>
                          <TableCell>৳{r.agreed_salary?.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">৳{r.commission_amount?.toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{r.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Payments ({detailPayments.length})</h3>
                {detailPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailPayments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{formatExactDate(new Date(p.created_at))}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">৳{p.amount?.toLocaleString()}</TableCell>
                          <TableCell className="capitalize text-xs">{p.payment_method || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{p.reference_number || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
