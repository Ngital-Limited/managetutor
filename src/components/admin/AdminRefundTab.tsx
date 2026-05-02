import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/adminLogger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, DollarSign, Search, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatExactDate } from '@/lib/date';

export function AdminRefundTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [refundDialog, setRefundDialog] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payment_transactions')
      .select('id, amount, currency, status, transaction_id, listing_type, created_at, completed_at, profiles!payment_transactions_user_id_fkey(full_name, email)')
      .in('status', ['completed', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(200);
    setPayments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = payments.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (p.profiles as any)?.full_name?.toLowerCase().includes(s) ||
      (p.profiles as any)?.email?.toLowerCase().includes(s) ||
      p.transaction_id?.toLowerCase().includes(s)
    );
  });

  const processRefund = async () => {
    if (!refundDialog || !user) return;
    setProcessing(true);
    try {
      const amount = parseFloat(refundAmount) || refundDialog.amount;
      await supabase
        .from('payment_transactions')
        .update({
          status: 'refunded',
          refund_reason: refundReason || 'Admin-initiated refund',
          refund_amount: amount,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', refundDialog.id);

      await logAdminAction(user.id, 'process_refund', 'payment', refundDialog.id);

      // Notify user
      await supabase.from('notifications').insert({
        user_id: refundDialog.user_id,
        title: 'Refund Processed',
        message: `A refund of ৳${amount} has been processed for your payment (${refundDialog.transaction_id}).`,
        type: 'refund',
      });

      toast({ title: 'Refund processed', description: `৳${amount} refund recorded for ${refundDialog.transaction_id}` });
      setRefundDialog(null);
      setRefundReason('');
      setRefundAmount('');
      fetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const totalRefunded = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + (p.refund_amount || p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Refund Management</h1>
          <p className="text-sm text-muted-foreground">Process and track payment refunds</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Total Payments</div>
            <div className="text-2xl font-bold">{payments.filter(p => p.status === 'completed').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Refunded</div>
            <div className="text-2xl font-bold text-destructive">{payments.filter(p => p.status === 'refunded').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground">Refund Amount</div>
            <div className="text-2xl font-bold">৳{totalRefunded.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, email, txn ID…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Txn ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-mono">{p.transaction_id || '—'}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{(p.profiles as any)?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{(p.profiles as any)?.email}</div>
                    </TableCell>
                    <TableCell className="font-semibold">৳{p.amount}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{p.listing_type || 'payment'}</Badge></TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${p.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(p.created_at))}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'completed' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setRefundDialog(p); setRefundAmount(String(p.amount)); }}>
                          <Undo2 className="h-3 w-3" /> Refund
                        </Button>
                      )}
                      {p.status === 'refunded' && <span className="text-xs text-muted-foreground">Refunded</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!refundDialog} onOpenChange={() => setRefundDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          {refundDialog && (
            <div className="space-y-4">
              <div className="text-sm">
                <strong>{(refundDialog.profiles as any)?.full_name}</strong> — Txn: {refundDialog.transaction_id}
              </div>
              <div>
                <label className="text-sm font-medium">Refund Amount (৳)</label>
                <Input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="mt-1" max={refundDialog.amount} />
                <p className="text-xs text-muted-foreground mt-1">Original: ৳{refundDialog.amount}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund…" className="mt-1" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(null)}>Cancel</Button>
            <Button onClick={processRefund} disabled={processing}>{processing ? 'Processing…' : 'Confirm Refund'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
