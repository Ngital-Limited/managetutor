import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, Activity } from 'lucide-react';

interface LogRow {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
  actor_name?: string;
}

const ACTION_LABELS: Record<string, string> = {
  user_approved: 'User Approved',
  user_banned: 'User Banned',
  user_unbanned: 'User Unbanned',
  job_approved: 'Job Approved',
  job_rejected: 'Job Rejected',
  hire_confirmed: 'Hire Confirmed',
  hire_cancelled: 'Hire Cancelled',
  commission_created: 'Commission Created',
  commission_waived: 'Commission Waived',
  payment_recorded: 'Payment Recorded',
  phone_call_logged: 'Phone Call Logged',
  role_transferred: 'Role Transferred',
  verification_approved: 'Verification Approved',
  verification_rejected: 'Verification Rejected',
  payout_approved: 'Payout Approved',
  payout_rejected: 'Payout Rejected',
  refund_approved: 'Refund Approved',
  refund_rejected: 'Refund Rejected',
};

const TARGET_TYPES = ['all', 'user', 'job', 'application', 'hire', 'commission'];

export function AdminActivityLogTab({ toast }: { toast: any }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('activity_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (targetFilter !== 'all') {
      query = query.eq('target_type', targetFilter);
    }

    const { data } = await query;
    const rows = (data || []) as any[];

    const actorIds = [...new Set(rows.map(r => r.actor_id))];
    const { data: profiles } = actorIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
      : { data: [] };
    const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));

    setLogs(rows.map(r => ({ ...r, actor_name: nameMap[r.actor_id] || 'System' })));
    setLoading(false);
  }, [targetFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.actor_name?.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.target_type.toLowerCase().includes(q)
    );
  });

  const actionBadge = (action: string) => {
    const label = ACTION_LABELS[action] || action.replace(/_/g, ' ');
    if (action.includes('approved') || action.includes('confirmed')) {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">{label}</Badge>;
    }
    if (action.includes('rejected') || action.includes('banned') || action.includes('cancelled') || action.includes('waived')) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">{label}</Badge>;
    }
    return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">{label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Actions Logged</p><p className="text-xl font-bold">{logs.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-success/10"><Activity className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Today's Actions</p><p className="text-xl font-bold">{logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by actor, action…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={targetFilter} onValueChange={setTargetFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TARGET_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No activity logs yet</TableCell></TableRow>
              ) : filtered.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatExactDate(l.created_at)}</TableCell>
                  <TableCell className="text-xs font-medium">{l.actor_name}</TableCell>
                  <TableCell>{actionBadge(l.action)}</TableCell>
                  <TableCell className="text-xs">
                    <span className="text-muted-foreground">{l.target_type}</span>
                    {l.target_id && <span className="ml-1 font-mono text-[10px]">{l.target_id.slice(0, 8)}…</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {Object.keys(l.details || {}).length > 0 ? JSON.stringify(l.details) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
