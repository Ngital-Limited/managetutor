import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent } from '@/components/ui/card';
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
import { Phone, Plus, Search, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { logAdminAction } from '@/lib/adminLogger';

interface FollowupRow {
  id: string;
  target_user_id: string;
  caller_id: string;
  phone_number: string | null;
  outcome: string;
  summary: string | null;
  follow_up_date: string | null;
  created_at: string;
  target_name?: string;
  target_role?: string;
  caller_name?: string;
}

const OUTCOMES: Record<string, { label: string; color: string }> = {
  reached: { label: 'Reached', color: 'bg-success/10 text-success border-success/20' },
  no_answer: { label: 'No Answer', color: 'bg-warning/10 text-warning border-warning/20' },
  busy: { label: 'Busy', color: 'bg-muted text-muted-foreground' },
  wrong_number: { label: 'Wrong Number', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  callback_requested: { label: 'Callback Requested', color: 'bg-primary/10 text-primary border-primary/20' },
};

export function AdminPhoneLogTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<FollowupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formUserId, setFormUserId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOutcome, setFormOutcome] = useState('reached');
  const [formSummary, setFormSummary] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState('');

  // User search for the form
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('phone_followups' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const rows = (data || []) as any[];
    const targetIds = [...new Set(rows.map(r => r.target_user_id))];
    const callerIds = [...new Set(rows.map(r => r.caller_id))];
    const allIds = [...new Set([...targetIds, ...callerIds])];

    const { data: profiles } = allIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', allIds)
      : { data: [] };
    const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));

    setFollowups(rows.map(r => ({
      ...r,
      target_name: nameMap[r.target_user_id] || 'Unknown',
      caller_name: nameMap[r.caller_id] || 'Admin',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchFollowups(); }, [fetchFollowups]);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, full_name, email, phone').ilike('full_name', `%${q}%`).limit(10);
    setUserResults(data || []);
  };

  const handleAdd = async () => {
    if (!formUserId || !user) return;
    setSaving(true);
    const { error } = await supabase.from('phone_followups' as any).insert({
      target_user_id: formUserId,
      caller_id: user.id,
      phone_number: formPhone || null,
      outcome: formOutcome,
      summary: formSummary || null,
      follow_up_date: formFollowUpDate || null,
    } as any);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      logAdminAction(user.id, 'phone_call_logged', 'user', formUserId, { outcome: formOutcome });
      toast({ title: 'Call logged' });
      setShowAdd(false);
      resetForm();
      fetchFollowups();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormUserId(''); setFormPhone(''); setFormOutcome('reached');
    setFormSummary(''); setFormFollowUpDate('');
    setSelectedUser(null); setUserSearch(''); setUserResults([]);
  };

  const filtered = followups.filter(f => {
    if (outcomeFilter !== 'all' && f.outcome !== outcomeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.target_name?.toLowerCase().includes(q) || f.phone_number?.includes(q);
    }
    return true;
  });

  const pendingCallbacks = followups.filter(f => f.outcome === 'callback_requested' && f.follow_up_date && new Date(f.follow_up_date) <= new Date()).length;
  const todayCalls = followups.filter(f => {
    const d = new Date(f.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Calls</p><p className="text-xl font-bold">{followups.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Today's Calls</p><p className="text-xl font-bold">{todayCalls}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Pending Callbacks</p><p className="text-xl font-bold">{pendingCallbacks}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            {Object.entries(OUTCOMES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setShowAdd(true); resetForm(); }}>
          <Plus className="h-4 w-4 mr-1" /> Log Call
        </Button>
      </div>

      {/* Table */}
      <Card>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No phone logs</TableCell></TableRow>
              ) : filtered.map(f => {
                const oc = OUTCOMES[f.outcome] || OUTCOMES.reached;
                const isOverdue = f.follow_up_date && new Date(f.follow_up_date) < new Date();
                return (
                  <TableRow key={f.id} className={isOverdue ? 'bg-warning/5' : ''}>
                    <TableCell className="text-xs font-medium">{f.target_name}</TableCell>
                    <TableCell className="text-xs">{f.phone_number || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${oc.color}`}>{oc.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{f.summary || '—'}</TableCell>
                    <TableCell className="text-xs">{f.caller_name}</TableCell>
                    <TableCell className="text-xs">
                      {f.follow_up_date ? (
                        <span className={isOverdue ? 'text-warning font-medium' : ''}>{format(new Date(f.follow_up_date), 'dd MMM')}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatExactDate(f.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Log Call Dialog */}
      <Dialog open={showAdd} onOpenChange={o => { if (!o) setShowAdd(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Phone Call</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* User search */}
            <div>
              <Label className="text-xs">User</Label>
              {selectedUser ? (
                <div className="flex items-center justify-between border rounded-md p-2 text-xs">
                  <span>{selectedUser.full_name} ({selectedUser.email})</span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setSelectedUser(null); setFormUserId(''); }}>Change</Button>
                </div>
              ) : (
                <div>
                  <Input value={userSearch} onChange={e => searchUsers(e.target.value)} placeholder="Search user by name…" className="text-xs" />
                  {userResults.length > 0 && (
                    <div className="border rounded-md mt-1 max-h-32 overflow-y-auto divide-y">
                      {userResults.map(u => (
                        <button
                          key={u.id}
                          className="w-full text-left p-2 text-xs hover:bg-muted flex justify-between"
                          onClick={() => { setSelectedUser(u); setFormUserId(u.id); setFormPhone(u.phone || ''); setUserResults([]); }}
                        >
                          <span>{u.full_name}</span>
                          <span className="text-muted-foreground">{u.phone || u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+880 1XXX…" />
              </div>
              <div>
                <Label className="text-xs">Outcome</Label>
                <Select value={formOutcome} onValueChange={setFormOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(OUTCOMES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Call Summary</Label>
              <Textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} rows={2} placeholder="Notes from the call…" />
            </div>
            <div>
              <Label className="text-xs">Next Follow-up Date (optional)</Label>
              <Input type="date" value={formFollowUpDate} onChange={e => setFormFollowUpDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={saving || !formUserId}>
              <Phone className="h-3.5 w-3.5 mr-1" /> Save Call Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
