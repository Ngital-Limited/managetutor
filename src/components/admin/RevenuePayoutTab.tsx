import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { DollarSign, CheckCircle2, XCircle, Clock, TrendingUp, ArrowDownRight, ArrowUpRight, Wallet, Percent } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPlatformCommissionPct } from '@/lib/commission';

export function RevenuePayoutTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [commissionPct, setCommissionPct] = useState<number>(20);

  useEffect(() => { getPlatformCommissionPct().then(setCommissionPct); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [payoutsRes, refundsRes, txnRes] = await Promise.all([
      supabase.from('payout_requests').select('*, tutor_profiles:tutor_id(display_name, profiles:user_id(full_name, email, phone))').order('created_at', { ascending: false }),
      supabase.from('refund_requests').select('*, profiles:parent_id(full_name, email, phone), demo_bookings:demo_booking_id(preferred_date, class_fee, tutor_profiles:tutor_id(display_name, profiles:user_id(full_name)))').order('created_at', { ascending: false }),
      supabase.from('payment_transactions').select('*, profiles:user_id(full_name, email), subscription_plans:plan_id(name)').order('created_at', { ascending: false }).limit(100),
    ]);
    setPayouts(payoutsRes.data || []);
    setRefunds(refundsRes.data || []);
    setTransactions(txnRes.data || []);

    // Build revenue chart data (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const completed = (txnRes.data || []).filter((t: any) => t.status === 'completed' && new Date(t.created_at) >= thirtyDaysAgo);
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      byDay[format(d, 'MMM dd')] = 0;
    }
    completed.forEach((t: any) => {
      const key = format(new Date(t.created_at), 'MMM dd');
      if (byDay[key] !== undefined) byDay[key] += Number(t.amount);
    });
    setRevenueData(Object.entries(byDay).map(([date, amount]) => ({ date, amount })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const totalPayoutsApproved = payouts.filter(p => p.status === 'approved' || p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const handlePayoutAction = async (id: string, status: string) => {
    setProcessing(true);
    const { error } = await supabase.from('payout_requests').update({
      status, admin_notes: adminNotes, processed_by: user?.id, processed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Payout ${status}` }); setSelectedPayout(null); setAdminNotes(''); fetchData(); }
    setProcessing(false);
  };

  const handleRefundAction = async (id: string, status: string) => {
    setProcessing(true);
    const { error } = await supabase.from('refund_requests').update({
      status, admin_notes: adminNotes, processed_by: user?.id, processed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Refund ${status}` }); setSelectedRefund(null); setAdminNotes(''); fetchData(); }
    setProcessing(false);
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'pending': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Approved</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Paid</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold">Revenue & Payouts</h1>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 text-sm py-1.5 px-3">
          <Percent className="h-3.5 w-3.5" /> Platform commission: {commissionPct}%
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">৳{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Payouts</p>
                <p className="text-xl font-bold">{pendingPayouts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid Out</p>
                <p className="text-xl font-bold">৳{totalPayoutsApproved.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><ArrowDownRight className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Refunds</p>
                <p className="text-xl font-bold">{pendingRefunds.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle>Revenue (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payouts">
        <TabsList>
          <TabsTrigger value="payouts">Payout Requests {pendingPayouts.length > 0 && <Badge className="ml-1 bg-warning text-warning-foreground text-xs">{pendingPayouts.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="refunds">Refund Requests {pendingRefunds.length > 0 && <Badge className="ml-1 bg-destructive text-destructive-foreground text-xs">{pendingRefunds.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="payouts">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tutor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : payouts.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payout requests</TableCell></TableRow>
                    ) : payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{p.tutor_profiles?.profiles?.full_name || p.tutor_profiles?.display_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{p.tutor_profiles?.profiles?.phone}</p>
                        </TableCell>
                        <TableCell className="font-bold">৳{p.amount.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{p.payment_method}</Badge></TableCell>
                        <TableCell>
                          <p className="text-sm">{p.account_number}</p>
                          {p.bank_name && <p className="text-xs text-muted-foreground">{p.bank_name}</p>}
                        </TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(p.created_at))}</TableCell>
                        <TableCell>
                          {p.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => { setSelectedPayout(p); setAdminNotes(''); }}>Review</Button>
                            </div>
                          )}
                          {p.status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => handlePayoutAction(p.id, 'paid')}>Mark Paid</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parent</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : refunds.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No refund requests</TableCell></TableRow>
                    ) : refunds.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{r.profiles?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                        </TableCell>
                        <TableCell className="font-bold">৳{r.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={r.reason}>{r.reason}</TableCell>
                        <TableCell className="text-sm">
                          {r.demo_bookings ? (
                            <span>{r.demo_bookings.preferred_date} · ৳{r.demo_bookings.class_fee}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(r.created_at))}</TableCell>
                        <TableCell>
                          {r.status === 'pending' && (
                            <Button size="sm" onClick={() => { setSelectedRefund(r); setAdminNotes(''); }}>Review</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{t.profiles?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{t.profiles?.email}</p>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{t.transaction_id}</TableCell>
                        <TableCell className="font-bold">৳{Number(t.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{t.subscription_plans?.name || t.listing_type || '—'}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Review Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Payout Request</DialogTitle></DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Tutor</p><p className="font-semibold">{selectedPayout.tutor_profiles?.profiles?.full_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-lg">৳{selectedPayout.amount.toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Method</p><p className="capitalize">{selectedPayout.payment_method}</p></div>
                <div><p className="text-xs text-muted-foreground">Account</p><p>{selectedPayout.account_number}</p></div>
                {selectedPayout.bank_name && <div><p className="text-xs text-muted-foreground">Bank</p><p>{selectedPayout.bank_name} - {selectedPayout.branch_name}</p></div>}
                {selectedPayout.account_name && <div><p className="text-xs text-muted-foreground">Account Name</p><p>{selectedPayout.account_name}</p></div>}
              </div>
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes..." className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => handlePayoutAction(selectedPayout.id, 'rejected')} disabled={processing}>Reject</Button>
            <Button onClick={() => handlePayoutAction(selectedPayout.id, 'approved')} disabled={processing}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Review Dialog */}
      <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Refund Request</DialogTitle></DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Parent</p><p className="font-semibold">{selectedRefund.profiles?.full_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-lg">৳{selectedRefund.amount.toLocaleString()}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Reason</p><p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedRefund.reason}</p></div>
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes..." className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleRefundAction(selectedRefund.id, 'rejected')} disabled={processing}>Reject</Button>
            <Button onClick={() => handleRefundAction(selectedRefund.id, 'approved')} disabled={processing}><CheckCircle2 className="h-4 w-4 mr-1" /> Approve Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
