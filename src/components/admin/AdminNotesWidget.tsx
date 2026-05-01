import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, StickyNote, AlertTriangle, Phone, Flag } from 'lucide-react';

interface Note {
  id: string;
  note: string;
  note_type: string;
  author_id: string;
  created_at: string;
  author_name?: string;
}

interface Props {
  targetUserId: string;
  compact?: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  general: { label: 'General', color: 'bg-muted text-muted-foreground', icon: StickyNote },
  follow_up: { label: 'Follow-up', color: 'bg-primary/10 text-primary border-primary/20', icon: Phone },
  warning: { label: 'Warning', color: 'bg-warning/10 text-warning border-warning/20', icon: AlertTriangle },
  escalation: { label: 'Escalation', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flag },
};

export function AdminNotesWidget({ targetUserId, compact = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('internal_notes' as any)
      .select('*')
      .eq('target_user_id', targetUserId)
      .order('created_at', { ascending: false });

    const rows = (data || []) as any[];
    // Fetch author names
    const authorIds = [...new Set(rows.map(r => r.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
      : { data: [] };
    const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));

    setNotes(rows.map(r => ({ ...r, author_name: nameMap[r.author_id] || 'Admin' })));
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleSave = async () => {
    if (!noteText.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('internal_notes' as any).insert({
      target_user_id: targetUserId,
      author_id: user.id,
      note: noteText.trim(),
      note_type: noteType,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Note added' });
      setNoteText(''); setShowForm(false);
      fetchNotes();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('internal_notes' as any).delete().eq('id', id);
    fetchNotes();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Notes ({notes.length})</p>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 border rounded-md p-2 bg-muted/20">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} placeholder="Write internal note…" className="text-xs" />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} disabled={saving || !noteText.trim()} className="h-7 text-xs">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No internal notes yet</p>
      ) : (
        <div className={`space-y-1.5 ${compact ? 'max-h-40 overflow-y-auto' : ''}`}>
          {notes.map(n => {
            const cfg = TYPE_CONFIG[n.note_type] || TYPE_CONFIG.general;
            return (
              <div key={n.id} className="border rounded-md p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                    <span className="text-muted-foreground">{n.author_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-[10px]">{formatExactDate(n.created_at)}</span>
                    <button onClick={() => handleDelete(n.id)} className="text-muted-foreground hover:text-destructive text-[10px]">×</button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{n.note}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
