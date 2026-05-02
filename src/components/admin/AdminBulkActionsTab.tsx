import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/adminLogger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Users, Briefcase, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatExactDate } from '@/lib/date';

type BulkMode = 'users' | 'jobs';

export function AdminBulkActionsTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<BulkMode>('users');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_approved, created_at, user_reference')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
      .limit(200);
    setItems(data || []);
    setLoading(false);
  }, []);

  const fetchPendingJobs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('id, title, job_reference, status, created_at, profiles!jobs_parent_id_fkey(full_name)')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
      .limit(200);
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelected(new Set());
    if (mode === 'users') fetchPendingUsers();
    else fetchPendingJobs();
  }, [mode, fetchPendingUsers, fetchPendingJobs]);

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const executeBulk = async () => {
    if (!confirmAction || selected.size === 0 || !user) return;
    setProcessing(true);
    try {
      const ids = Array.from(selected);
      if (mode === 'users') {
        if (confirmAction === 'approve') {
          await supabase.from('profiles').update({ is_approved: true }).in('id', ids);
        } else {
          await supabase.from('profiles').update({ is_banned: true }).in('id', ids);
        }
        for (const id of ids) {
          await logAdminAction(user.id, confirmAction === 'approve' ? 'bulk_approve_user' : 'bulk_reject_user', 'user', id);
        }
      } else {
        const newStatus = confirmAction === 'approve' ? 'open' : 'cancelled';
        await supabase.from('jobs').update({ status: newStatus }).in('id', ids);
        for (const id of ids) {
          await logAdminAction(user.id, confirmAction === 'approve' ? 'bulk_approve_job' : 'bulk_reject_job', 'job', id);
        }
      }
      toast({ title: 'Bulk action completed', description: `${ids.length} ${mode} ${confirmAction}d successfully` });
      setSelected(new Set());
      setConfirmAction(null);
      if (mode === 'users') fetchPendingUsers(); else fetchPendingJobs();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bulk Actions</h1>
          <p className="text-sm text-muted-foreground">Approve or reject multiple pending items at once</p>
        </div>
        <div className="flex gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as BulkMode)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="users"><Users className="h-3.5 w-3.5 inline mr-2" />Pending Users</SelectItem>
              <SelectItem value="jobs"><Briefcase className="h-3.5 w-3.5 inline mr-2" />Pending Jobs</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => mode === 'users' ? fetchPendingUsers() : fetchPendingJobs()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-medium">{selected.size} item(s) selected</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setConfirmAction('approve')} className="gap-1">
                <CheckCircle2 className="h-4 w-4" /> Approve All
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmAction('reject')} className="gap-1">
                <XCircle className="h-4 w-4" /> Reject All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={items.length > 0 && selected.size === items.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  {mode === 'users' ? (
                    <>
                      <TableHead>Ref</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Ref</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Posted By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending {mode} found</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell><Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} /></TableCell>
                    {mode === 'users' ? (
                      <>
                        <TableCell className="text-xs font-mono">{item.user_reference || '—'}</TableCell>
                        <TableCell className="font-medium text-sm">{item.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                        <TableCell className="text-xs font-mono">{item.phone || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(item.created_at))}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-xs font-mono">{item.job_reference || '—'}</TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{item.title}</TableCell>
                        <TableCell className="text-sm">{(item.profiles as any)?.full_name || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{item.status?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(item.created_at))}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk {confirmAction === 'approve' ? 'Approval' : 'Rejection'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {confirmAction} {selected.size} {mode}? This action will be logged.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant={confirmAction === 'reject' ? 'destructive' : 'default'} onClick={executeBulk} disabled={processing}>
              {processing ? 'Processing…' : `${confirmAction === 'approve' ? 'Approve' : 'Reject'} ${selected.size} ${mode}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
