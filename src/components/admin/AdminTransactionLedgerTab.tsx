import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { DollarSign, CreditCard, Search, Download, FileText, Filter, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface LedgerEntry {
  id: string;
  type: 'payment' | 'commission' | 'commission_payment';
  date: string;
  amount: number;
  status: string;
  description: string;
  reference: string;
  userName: string;
  method?: string;
}

export function AdminTransactionLedgerTab({ toast }: { toast: any }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch payment_transactions
      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('id, transaction_id, user_id, amount, status, listing_type, created_at, completed_at, profiles:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch commission_records
      const { data: commissions } = await supabase
        .from('commission_records' as any)
        .select('id, tutor_id, parent_id, agreed_salary, commission_amount, amount_paid, amount_due, status, due_date, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch commission_payments
      const { data: commPayments } = await supabase
        .from('commission_payments' as any)
        .select('id, commission_id, amount, payment_method, payment_reference, payment_date, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      const ledger: LedgerEntry[] = [];

      // Map payments
      (payments || []).forEach((p: any) => {
        ledger.push({
          id: p.id,
          type: 'payment',
          date: p.completed_at || p.created_at,
          amount: Number(p.amount),
          status: p.status,
          description: p.listing_type ? `${p.listing_type} payment` : 'Platform payment',
          reference: p.transaction_id || '',
          userName: p.profiles?.full_name || 'Unknown',
          method: 'Online (SSLCommerz)',
        });
      });

      // Map commissions
      (commissions || []).forEach((c: any) => {
        ledger.push({
          id: c.id,
          type: 'commission',
          date: c.created_at,
          amount: c.commission_amount,
          status: c.status,
          description: `Commission on ৳${c.agreed_salary} salary`,
          reference: `Due: ৳${c.amount_due}`,
          userName: '',
        });
      });

      // Map commission payments
      (commPayments || []).forEach((cp: any) => {
        ledger.push({
          id: cp.id,
          type: 'commission_payment',
          date: cp.payment_date || cp.created_at,
          amount: cp.amount,
          status: 'completed',
          description: 'Commission payment received',
          reference: cp.payment_reference || '',
          userName: '',
          method: cp.payment_method,
        });
      });

      // Sort by date desc
      ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(ledger);
    } catch (err: any) {
      toast({ title: 'Error loading ledger', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = entries.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (dateFrom && new Date(e.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.date) > new Date(dateTo + 'T23:59:59')) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.description.toLowerCase().includes(q) && !e.userName.toLowerCase().includes(q) && !e.reference.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totals = {
    revenue: filtered.filter(e => e.type === 'payment' && e.status === 'completed').reduce((s, e) => s + e.amount, 0),
    commissions: filtered.filter(e => e.type === 'commission').reduce((s, e) => s + e.amount, 0),
    collected: filtered.filter(e => e.type === 'commission_payment').reduce((s, e) => s + e.amount, 0),
  };

  const typeColor = (t: string) => {
    switch (t) {
      case 'payment': return 'bg-primary/10 text-primary border-primary/20';
      case 'commission': return 'bg-warning/10 text-warning border-warning/20';
      case 'commission_payment': return 'bg-success/10 text-success border-success/20';
      default: return '';
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'completed': case 'paid': case 'fully_paid': return 'bg-success/10 text-success';
      case 'pending': case 'unpaid': return 'bg-warning/10 text-warning';
      case 'overdue': return 'bg-destructive/10 text-destructive';
      case 'waived': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const exportCSV = () => {
    const header = 'Date,Type,Amount,Status,Description,Reference,User,Method\n';
    const rows = filtered.map(e =>
      `"${format(new Date(e.date), 'yyyy-MM-dd HH:mm')}","${e.type}","${e.amount}","${e.status}","${e.description}","${e.reference}","${e.userName}","${e.method || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ledger_${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filtered.length} entries exported to CSV` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Transaction Ledger</h1>
          <p className="text-sm text-muted-foreground">Unified view of all financial transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Online Revenue</p><p className="text-lg font-bold">৳{totals.revenue.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><TrendingUp className="h-5 w-5 text-warning" /></div>
            <div><p className="text-xs text-muted-foreground">Total Commissions</p><p className="text-lg font-bold">৳{totals.commissions.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><Wallet className="h-5 w-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-lg font-bold">৳{totals.collected.toLocaleString()}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="payment">Online Payment</SelectItem>
            <SelectItem value="commission">Commission</SelectItem>
            <SelectItem value="commission_payment">Commission Payment</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" placeholder="To" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
              ) : filtered.slice(0, 200).map(e => (
                <TableRow key={`${e.type}-${e.id}`}>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(e.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${typeColor(e.type)}`}>{e.type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="font-medium">৳{e.amount.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${statusBadge(e.status)}`}>{e.status}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[150px] truncate">{e.reference}</TableCell>
                  <TableCell className="text-sm">{e.userName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 200 && (
            <div className="text-center py-3 text-xs text-muted-foreground">Showing 200 of {filtered.length} entries. Use filters to narrow results.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
