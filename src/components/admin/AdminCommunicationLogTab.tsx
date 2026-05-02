import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Search, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatExactDate } from '@/lib/date';

export function AdminCommunicationLogTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('notifications')
      .select('id, user_id, title, message, type, is_read, created_at, profiles!notifications_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (typeFilter !== 'all') q = q.eq('type', typeFilter);
    if (search.trim()) q = q.or(`title.ilike.%${search.trim()}%,message.ilike.%${search.trim()}%`);

    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  }, [page, typeFilter, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const typeColor = (t: string) => {
    if (t === 'broadcast') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (t.includes('application')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    if (t === 'new_job') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (t.includes('commission') || t.includes('payment')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-muted text-muted-foreground';
  };

  const exportCSV = () => {
    const rows = logs.map(l => ({
      date: l.created_at,
      type: l.type,
      recipient: (l.profiles as any)?.full_name || '—',
      email: (l.profiles as any)?.email || '—',
      title: l.title,
      message: l.message,
      read: l.is_read ? 'Yes' : 'No',
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as any)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communication-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Communication log exported as CSV' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Communication Log</h1>
          <p className="text-sm text-muted-foreground">History of all notifications sent via the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title or message…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="broadcast">Broadcast</SelectItem>
            <SelectItem value="new_job">New Job</SelectItem>
            <SelectItem value="application_received">Application Received</SelectItem>
            <SelectItem value="application_accepted">Accepted</SelectItem>
            <SelectItem value="application_rejected">Rejected</SelectItem>
            <SelectItem value="commission_reminder">Commission Reminder</SelectItem>
            <SelectItem value="admin_notification">Admin Notice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No logs found</TableCell></TableRow>
                ) : logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatExactDate(new Date(l.created_at))}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${typeColor(l.type)}`}>{l.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-sm">
                      <div>{(l.profiles as any)?.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{(l.profiles as any)?.email || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">{l.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{l.message}</TableCell>
                    <TableCell>
                      <Badge variant={l.is_read ? 'secondary' : 'default'} className="text-[10px]">{l.is_read ? 'Read' : 'Unread'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
        <span className="text-xs text-muted-foreground">Page {page}</span>
        <Button variant="outline" size="sm" disabled={logs.length < pageSize} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
