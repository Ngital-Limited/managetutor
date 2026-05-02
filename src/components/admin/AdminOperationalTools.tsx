import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/adminLogger';
import { format } from 'date-fns';
import {
  Send, Search, Bell, UserCheck, Phone, DollarSign,
  AlertTriangle, Clock, CreditCard, RefreshCw
} from 'lucide-react';

interface Props {
  toast: (opts: any) => void;
}

/* ─── Send Notification to Individual User ─── */
export function AdminSendNotification({ toast }: Props) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    const term = `%${searchTerm.trim()}%`;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, user_reference')
      .or(`full_name.ilike.${term},email.ilike.${term},user_reference.ilike.${term}`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleSend = async () => {
    if (!selectedUser || !title.trim() || !message.trim()) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSending(true);
    const { error } = await supabase.from('notifications').insert({
      user_id: selectedUser.id,
      title: title.trim(),
      message: message.trim(),
      type: 'admin_direct',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Notification sent', description: `Sent to ${selectedUser.full_name}` });
      if (user) logAdminAction(user.id, 'send_notification', 'user', selectedUser.id, { title: title.trim() });
      setTitle('');
      setMessage('');
      setSelectedUser(null);
    }
    setSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Send Notification to User</CardTitle>
        <CardDescription>Send an individual in-app notification to any user.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search by name, email, or reference…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={searchUsers} disabled={searching}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        {searchResults.length > 0 && !selectedUser && (
          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between"
                onClick={() => { setSelectedUser(u); setSearchResults([]); }}
              >
                <span className="font-medium">{u.full_name}</span>
                <span className="text-muted-foreground text-xs">{u.email}</span>
              </button>
            ))}
          </div>
        )}
        {selectedUser && (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedUser.full_name}</span>
            <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setSelectedUser(null)}>Change</Button>
          </div>
        )}
        <Input placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        <Textarea placeholder="Notification message…" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500} />
        <Button className="w-full" onClick={handleSend} disabled={sending || !selectedUser || !title.trim() || !message.trim()}>
          <Send className="h-4 w-4 mr-2" /> Send Notification
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Manual Contact Release ─── */
export function AdminManualContactRelease({ toast }: Props) {
  const { user } = useAuth();
  const [appId, setAppId] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const releaseContact = async () => {
    if (!appId.trim()) return;
    setReleasing(true);
    setResult(null);

    const { data: app, error } = await supabase
      .from('applications')
      .select('id, tutor_id, job_id, status, contact_released_at')
      .eq('id', appId.trim())
      .maybeSingle();

    if (error || !app) {
      setResult('Application not found');
      setReleasing(false);
      return;
    }

    if (app.contact_released_at) {
      setResult(`Contact already released on ${format(new Date(app.contact_released_at), 'PPp')}`);
      setReleasing(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({ contact_released_at: new Date().toISOString(), status: 'accepted' as any })
      .eq('id', app.id);

    if (updateError) {
      setResult(`Error: ${updateError.message}`);
    } else {
      setResult('Contact released successfully!');
      toast({ title: 'Contact released', description: `Application ${app.id.slice(0, 8)} contact released.` });
      if (user) logAdminAction(user.id, 'manual_contact_release', 'application', app.id);
    }
    setReleasing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Phone className="h-4 w-4 text-primary" /> Manual Contact Release</CardTitle>
        <CardDescription>Release guardian contact info to a tutor for a specific application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Application ID" value={appId} onChange={(e) => setAppId(e.target.value)} className="flex-1 font-mono text-sm" />
          <Button onClick={releaseContact} disabled={releasing || !appId.trim()}>
            {releasing ? <Clock className="h-4 w-4 animate-spin" /> : 'Release'}
          </Button>
        </div>
        {result && (
          <p className={`text-sm ${result.includes('Error') || result.includes('not found') ? 'text-destructive' : 'text-green-600'}`}>{result}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Manual Offline Payment Entry ─── */
export function AdminOfflinePaymentEntry({ toast }: Props) {
  const { user } = useAuth();
  const [commissionId, setCommissionId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!commissionId.trim() || !amount) {
      toast({ title: 'Commission ID and amount required', variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Verify commission exists
    const { data: comm } = await supabase
      .from('commission_records')
      .select('id, amount_due, amount_paid, commission_amount')
      .eq('id', commissionId.trim())
      .maybeSingle();

    if (!comm) {
      toast({ title: 'Commission record not found', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const payAmount = parseInt(amount);

    // Insert payment
    const { error } = await supabase.from('commission_payments').insert({
      commission_id: comm.id,
      amount: payAmount,
      payment_method: method,
      payment_reference: reference || null,
      notes: notes || null,
      received_by: user?.id || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update commission record
      const newPaid = (comm.amount_paid || 0) + payAmount;
      const newDue = Math.max(0, (comm.commission_amount || 0) - newPaid);
      const newStatus = newDue <= 0 ? 'paid' : 'partial';

      await supabase.from('commission_records').update({
        amount_paid: newPaid,
        amount_due: newDue,
        status: newStatus,
      }).eq('id', comm.id);

      toast({ title: 'Payment recorded', description: `৳${payAmount} via ${method}` });
      if (user) logAdminAction(user.id, 'record_offline_payment', 'commission', comm.id, { amount: payAmount, method });
      setAmount('');
      setReference('');
      setNotes('');
      setCommissionId('');
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-primary" /> Record Offline Payment</CardTitle>
        <CardDescription>Manually record bKash, Nagad, or cash commission payments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Commission Record ID" value={commissionId} onChange={(e) => setCommissionId(e.target.value)} className="font-mono text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Amount (৳)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Method</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Input placeholder="Transaction reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <Button className="w-full" onClick={handleSave} disabled={saving || !commissionId.trim() || !amount}>
          <DollarSign className="h-4 w-4 mr-2" /> Record Payment
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Commission Reminder Sender ─── */
export function AdminCommissionReminders({ toast }: Props) {
  const { user } = useAuth();
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchOverdue = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('commission_records')
      .select('id, tutor_id, job_id, commission_amount, amount_paid, amount_due, due_date, status')
      .in('status', ['pending', 'overdue', 'partial'])
      .order('due_date', { ascending: true })
      .limit(50);

    if (data && data.length > 0) {
      const tutorIds = [...new Set(data.map(d => d.tutor_id))];
      const { data: tutors } = await supabase.from('tutor_profiles').select('id, user_id, display_name').in('id', tutorIds);
      const tutorUserIds = tutors?.map(t => t.user_id) || [];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', tutorUserIds);
      const profMap = new Map(profs?.map(p => [p.id, p]) || []);
      const tutorMap = new Map(tutors?.map(t => [t.id, { ...t, profile: profMap.get(t.user_id) }]) || []);

      setOverdue(data.map(d => ({ ...d, tutor: tutorMap.get(d.tutor_id) })));
    } else {
      setOverdue([]);
    }
    setLoading(false);
  };

  const sendReminder = async (record: any) => {
    const tutorUserId = record.tutor?.user_id;
    if (!tutorUserId) {
      toast({ title: 'Tutor not found', variant: 'destructive' });
      return;
    }
    setSendingId(record.id);

    const dueAmount = record.amount_due || (record.commission_amount - record.amount_paid);
    await supabase.from('notifications').insert({
      user_id: tutorUserId,
      title: 'Commission Payment Reminder',
      message: `You have an outstanding commission payment of ৳${dueAmount?.toLocaleString()}${record.due_date ? ` due by ${record.due_date}` : ''}. Please arrange payment at your earliest convenience.`,
      type: 'commission_reminder',
      reference_id: record.id,
    });

    // Mark as overdue if past due date
    if (record.due_date && new Date(record.due_date) < new Date() && record.status !== 'overdue') {
      await supabase.from('commission_records').update({ status: 'overdue' }).eq('id', record.id);
    }

    toast({ title: 'Reminder sent', description: `Commission reminder sent to ${record.tutor?.profile?.full_name || 'tutor'}` });
    if (user) logAdminAction(user.id, 'send_commission_reminder', 'commission', record.id);
    setSendingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-warning" /> Commission Reminders</CardTitle>
        <CardDescription>View outstanding commissions and send payment reminders.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" onClick={fetchOverdue} disabled={loading} className="w-full">
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Load Outstanding Commissions
        </Button>
        {overdue.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.tutor?.profile?.full_name || r.tutor?.display_name || '—'}</TableCell>
                    <TableCell className="text-sm font-medium">৳{(r.amount_due || (r.commission_amount - r.amount_paid))?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.due_date || '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendReminder(r)}
                        disabled={sendingId === r.id}
                        className="text-xs"
                      >
                        <Send className="h-3 w-3 mr-1" /> Remind
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && overdue.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Click "Load" to fetch outstanding commissions</p>
        )}
      </CardContent>
    </Card>
  );
}
