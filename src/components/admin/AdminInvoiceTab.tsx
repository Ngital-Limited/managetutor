import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { FileText, Download, Printer, Search } from 'lucide-react';

interface InvoiceData {
  id: string;
  commissionId: string;
  tutorName: string;
  parentName: string;
  jobTitle: string;
  agreedSalary: number;
  commissionPct: number;
  commissionAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  dueDate: string;
  createdAt: string;
  payments: { amount: number; method: string; date: string; reference: string }[];
}

export function AdminInvoiceTab({ toast }: { toast: any }) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: records } = await supabase
        .from('commission_records' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!records || records.length === 0) { setInvoices([]); setLoading(false); return; }

      // Get related data
      const tutorIds = [...new Set((records as any[]).map(r => r.tutor_id).filter(Boolean))];
      const parentIds = [...new Set((records as any[]).map(r => r.parent_id).filter(Boolean))];
      const jobIds = [...new Set((records as any[]).map(r => r.job_id).filter(Boolean))];
      const commIds = (records as any[]).map(r => r.id);

      const [tutorRes, parentRes, jobRes, payRes] = await Promise.all([
        tutorIds.length > 0 ? supabase.from('tutor_profiles').select('id, user_id, profiles:user_id(full_name)').in('id', tutorIds) : { data: [] },
        parentIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', parentIds) : { data: [] },
        jobIds.length > 0 ? supabase.from('jobs').select('id, title').in('id', jobIds) : { data: [] },
        commIds.length > 0 ? supabase.from('commission_payments' as any).select('*').in('commission_id', commIds) : { data: [] },
      ]);

      const tutorMap = new Map((tutorRes.data || []).map((t: any) => [t.id, t.profiles?.full_name || 'Unknown']));
      const parentMap = new Map((parentRes.data || []).map((p: any) => [p.id, p.full_name || 'Unknown']));
      const jobMap = new Map((jobRes.data || []).map((j: any) => [j.id, j.title || '']));

      const invoiceList: InvoiceData[] = (records as any[]).map(r => ({
        id: r.id,
        commissionId: r.id,
        tutorName: tutorMap.get(r.tutor_id) || 'Unknown',
        parentName: parentMap.get(r.parent_id) || 'Unknown',
        jobTitle: jobMap.get(r.job_id) || '',
        agreedSalary: r.agreed_salary,
        commissionPct: Number(r.commission_pct),
        commissionAmount: r.commission_amount,
        amountPaid: r.amount_paid,
        amountDue: r.amount_due,
        status: r.status,
        dueDate: r.due_date,
        createdAt: r.created_at,
        payments: ((payRes.data || []) as any[])
          .filter(p => p.commission_id === r.id)
          .map(p => ({ amount: p.amount, method: p.payment_method, date: p.payment_date || p.created_at, reference: p.payment_reference || '' })),
      }));

      setInvoices(invoiceList);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inv.tutorName.toLowerCase().includes(q) || inv.parentName.toLowerCase().includes(q) || inv.jobTitle.toLowerCase().includes(q);
  });

  const generateInvoiceHTML = (inv: InvoiceData) => {
    const invoiceNum = `INV-${format(new Date(inv.createdAt), 'yyyyMMdd')}-${inv.id.slice(0, 6).toUpperCase()}`;
    return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoiceNum}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #1a1a2e; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
  .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
  .logo small { display: block; font-size: 12px; color: #666; font-weight: 400; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { margin: 0; font-size: 28px; color: #2563eb; }
  .invoice-title p { margin: 4px 0 0; color: #666; font-size: 13px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #999; letter-spacing: 1px; }
  .party p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #2563eb; background: #eff6ff; }
  .payments { margin-top: 20px; }
  .payments h3 { font-size: 14px; margin-bottom: 10px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .status-paid { background: #dcfce7; color: #16a34a; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div class="logo">ManageTutor<small>Home Tuition Marketplace</small></div>
  <div class="invoice-title">
    <h1>INVOICE</h1>
    <p>${invoiceNum}</p>
    <p>Date: ${format(new Date(inv.createdAt), 'dd MMM yyyy')}</p>
    <p>Due: ${inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : 'N/A'}</p>
  </div>
</div>
<div class="parties">
  <div class="party"><h3>Bill To (Parent/Guardian)</h3><p><strong>${inv.parentName}</strong></p></div>
  <div class="party"><h3>Service Provider (Tutor)</h3><p><strong>${inv.tutorName}</strong></p></div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td>Tuition Job: ${inv.jobTitle || 'N/A'}</td><td style="text-align:right"></td></tr>
    <tr><td>Agreed Monthly Salary</td><td style="text-align:right">৳${inv.agreedSalary.toLocaleString()}</td></tr>
    <tr><td>Platform Commission (${inv.commissionPct}%)</td><td style="text-align:right">৳${inv.commissionAmount.toLocaleString()}</td></tr>
    <tr><td>Amount Already Paid</td><td style="text-align:right">-৳${inv.amountPaid.toLocaleString()}</td></tr>
    <tr class="total-row"><td>Amount Due</td><td style="text-align:right">৳${inv.amountDue.toLocaleString()}</td></tr>
  </tbody>
</table>
${inv.payments.length > 0 ? `
<div class="payments"><h3>Payment History</h3><table>
  <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${inv.payments.map(p => `<tr><td>${format(new Date(p.date), 'dd MMM yyyy')}</td><td>${p.method}</td><td>${p.reference}</td><td style="text-align:right">৳${p.amount.toLocaleString()}</td></tr>`).join('')}</tbody>
</table></div>` : ''}
<p>Status: <span class="status status-${inv.status === 'fully_paid' || inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : 'pending'}">${inv.status.toUpperCase().replace('_', ' ')}</span></p>
<div class="footer">
  <p>ManageTutor — Bangladesh's Home Tuition Platform</p>
  <p>managetutor.com | This is a system-generated invoice.</p>
</div>
</body></html>`;
  };

  const printInvoice = (inv: InvoiceData) => {
    const html = generateInvoiceHTML(inv);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const downloadInvoice = (inv: InvoiceData) => {
    const html = generateInvoiceHTML(inv);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const invoiceNum = `INV-${format(new Date(inv.createdAt), 'yyyyMMdd')}-${inv.id.slice(0, 6).toUpperCase()}`;
    a.href = url; a.download = `${invoiceNum}.html`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: `Invoice ${invoiceNum} downloaded` });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'fully_paid': case 'paid': return 'bg-success/10 text-success';
      case 'pending': case 'unpaid': return 'bg-warning/10 text-warning';
      case 'overdue': return 'bg-destructive/10 text-destructive';
      case 'waived': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Invoice Generation</h1>
        <p className="text-sm text-muted-foreground">Generate and print invoices for commission records</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tutor, parent, or job..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tutor</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No commission records found</TableCell></TableRow>
              ) : filtered.map(inv => {
                const invNum = `INV-${format(new Date(inv.createdAt), 'yyyyMMdd')}-${inv.id.slice(0, 6).toUpperCase()}`;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{invNum}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-sm">{inv.tutorName}</TableCell>
                    <TableCell className="text-sm">{inv.parentName}</TableCell>
                    <TableCell className="font-medium">৳{inv.commissionAmount.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">৳{inv.amountDue.toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${statusColor(inv.status)}`}>{inv.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => printInvoice(inv)} title="Print">
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoice(inv)} title="Download">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
