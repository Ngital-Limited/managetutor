import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Search, BookOpen, MapPin, Map, GraduationCap, Settings as SettingsIcon, BadgeCheck, Percent, Star, Briefcase, UserCheck } from 'lucide-react';

// ─── Settings Manager ───
type SettingDef = {
  key: string;
  label: string;
  description: string;
  unit: '৳' | '%';
  defaultValue: string;
  icon: any;
  max?: number;
};

const SETTING_DEFS: SettingDef[] = [
  { key: 'verification_fee', label: 'Tutor Verification Badge Fee', description: 'Fee charged to tutors when they purchase the Verified Badge.', unit: '৳', defaultValue: '50', icon: BadgeCheck },
  { key: 'platform_commission_pct', label: 'Platform Commission', description: 'Percentage commission deducted from tutor earnings on matches and demo classes.', unit: '%', defaultValue: '20', icon: Percent, max: 100 },
  { key: 'featured_tutor_price', label: 'Featured Tutor Listing Price', description: 'One-time price for boosting a tutor profile to featured.', unit: '৳', defaultValue: '500', icon: Star },
  { key: 'featured_job_price', label: 'Featured Job Listing Price', description: 'One-time price for boosting a parent job post to featured.', unit: '৳', defaultValue: '300', icon: Briefcase },
  { key: 'min_profile_completeness', label: 'Minimum Profile Completeness', description: 'Minimum tutor profile completeness % required before applying to jobs.', unit: '%', defaultValue: '70', icon: UserCheck, max: 100 },
];

function SettingsManager({ toast }: { toast: any }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', SETTING_DEFS.map(s => s.key));
    const map: Record<string, string> = {};
    SETTING_DEFS.forEach(s => { map[s.key] = s.defaultValue; });
    (data || []).forEach((row: any) => { map[row.key] = row.value; });
    setValues(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async (def: SettingDef) => {
    const raw = values[def.key];
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || (def.max !== undefined && n > def.max)) {
      toast({ title: `Enter a valid number${def.max !== undefined ? ` (0–${def.max})` : ' (≥ 0)'}`, variant: 'destructive' });
      return;
    }
    setSavingKey(def.key);
    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        { key: def.key, value: String(def.unit === '%' ? n : Math.round(n)), description: def.description },
        { onConflict: 'key' }
      );
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: `${def.label} updated` });
    setSavingKey(null);
  };

  return (
    <div className="space-y-4 max-w-xl">
      {SETTING_DEFS.map((def) => {
        const Icon = def.icon;
        return (
          <Card key={def.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {def.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{def.description}</p>
              <div className="flex items-center gap-2">
                {def.unit === '৳' && <span className="text-sm font-medium">৳</span>}
                <Input
                  type="number"
                  min={0}
                  max={def.max}
                  step={def.unit === '%' ? 0.1 : 1}
                  value={loading ? '' : (values[def.key] ?? '')}
                  onChange={(e) => setValues((v) => ({ ...v, [def.key]: e.target.value }))}
                  placeholder={def.defaultValue}
                  disabled={loading}
                  className="max-w-[160px]"
                />
                {def.unit === '%' && <span className="text-sm font-medium">%</span>}
                <Button onClick={() => handleSave(def)} disabled={savingKey === def.key || loading} size="sm">
                  {savingKey === def.key ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}


// ─── Subjects Manager ───
function SubjectsManager({ toast }: { toast: any }) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name_en: '', name_bn: '', category_en: '', category_bn: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('subjects').select('*').order('category_en').order('name_en');
    if (search) query = query.or(`name_en.ilike.%${search}%,name_bn.ilike.%${search}%,category_en.ilike.%${search}%`);
    const { data } = await query;
    setSubjects(data || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditingId(null); setForm({ name_en: '', name_bn: '', category_en: '', category_bn: '' }); setDialogOpen(true); };
  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ name_en: s.name_en, name_bn: s.name_bn, category_en: s.category_en || '', category_bn: s.category_bn || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_en.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      name_en: form.name_en.trim(), name_bn: form.name_en.trim(),
      category_en: form.category_en.trim() || null, category_bn: form.category_en.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from('subjects').update(payload).eq('id', editingId)
      : await supabase.from('subjects').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: editingId ? 'Subject updated' : 'Subject created' }); setDialogOpen(false); fetch(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject? This may affect existing jobs and tutor profiles.')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Subject deleted' }); fetch(); }
  };

  const categories = [...new Set(subjects.map(s => s.category_en).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search subjects..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Subject</Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{subjects.length} subjects</span>
        {categories.length > 0 && <span>· {categories.length} categories</span>}
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : subjects.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No subjects found</TableCell></TableRow>
                ) : subjects.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name_en}</TableCell>
                    <TableCell>{s.category_en ? <Badge variant="outline" className="text-xs">{s.category_en}</Badge> : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Mathematics" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input value={form.category_en} onChange={e => setForm(p => ({ ...p, category_en: e.target.value }))} placeholder="e.g. Science" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Districts Manager ───
function DistrictsManager({ toast }: { toast: any }) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name_en: '', name_bn: '', division_en: '', division_bn: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('districts').select('*').order('division_en').order('name_en');
    if (search) query = query.or(`name_en.ilike.%${search}%,name_bn.ilike.%${search}%,division_en.ilike.%${search}%`);
    const { data } = await query;
    setDistricts(data || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditingId(null); setForm({ name_en: '', name_bn: '', division_en: '', division_bn: '' }); setDialogOpen(true); };
  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({ name_en: d.name_en, name_bn: d.name_bn, division_en: d.division_en, division_bn: d.division_bn });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_en.trim() || !form.name_bn.trim() || !form.division_en.trim() || !form.division_bn.trim()) {
      toast({ title: 'All fields required', variant: 'destructive' }); return;
    }
    setSaving(true);
    const payload = {
      name_en: form.name_en.trim(), name_bn: form.name_bn.trim(),
      division_en: form.division_en.trim(), division_bn: form.division_bn.trim(),
    };
    const { error } = editingId
      ? await supabase.from('districts').update(payload).eq('id', editingId)
      : await supabase.from('districts').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: editingId ? 'District updated' : 'District created' }); setDialogOpen(false); fetch(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this district? This may affect users and jobs in this district.')) return;
    const { error } = await supabase.from('districts').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'District deleted' }); fetch(); }
  };

  const divisions = [...new Set(districts.map(d => d.division_en).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search districts..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Add District</Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{districts.length} districts</span>
        {divisions.length > 0 && <span>· {divisions.length} divisions</span>}
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name (EN)</TableHead>
                  <TableHead>Name (BN)</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : districts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No districts found</TableCell></TableRow>
                ) : districts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.name_en}</TableCell>
                    <TableCell className="text-sm">{d.name_bn}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{d.division_en}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit District' : 'Add District'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Name (English) *</label>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Dhaka" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Name (Bangla) *</label>
                <Input value={form.name_bn} onChange={e => setForm(p => ({ ...p, name_bn: e.target.value }))} placeholder="e.g. ঢাকা" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Division (English) *</label>
                <Input value={form.division_en} onChange={e => setForm(p => ({ ...p, division_en: e.target.value }))} placeholder="e.g. Dhaka" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Division (Bangla) *</label>
                <Input value={form.division_bn} onChange={e => setForm(p => ({ ...p, division_bn: e.target.value }))} placeholder="e.g. ঢাকা" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Areas Manager ───
function AreasManager({ toast }: { toast: any }) {
  const [areas, setAreas] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name_en: '', name_bn: '', district_id: '' });
  const [saving, setSaving] = useState(false);

  const fetchDistricts = useCallback(async () => {
    const { data } = await supabase.from('districts').select('id, name_en').order('name_en');
    setDistricts(data || []);
  }, []);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('areas').select('*, districts(name_en)').order('name_en');
    if (search) query = query.or(`name_en.ilike.%${search}%,name_bn.ilike.%${search}%`);
    if (districtFilter !== 'all') query = query.eq('district_id', districtFilter);
    const { data } = await query;
    setAreas(data || []);
    setLoading(false);
  }, [search, districtFilter]);

  useEffect(() => { fetchDistricts(); }, [fetchDistricts]);
  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  const openCreate = () => { setEditingId(null); setForm({ name_en: '', name_bn: '', district_id: districts[0]?.id || '' }); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({ name_en: a.name_en, name_bn: a.name_bn, district_id: a.district_id });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_en.trim() || !form.name_bn.trim() || !form.district_id) {
      toast({ title: 'All fields required', variant: 'destructive' }); return;
    }
    setSaving(true);
    const payload = { name_en: form.name_en.trim(), name_bn: form.name_bn.trim(), district_id: form.district_id };
    const { error } = editingId
      ? await supabase.from('areas').update(payload).eq('id', editingId)
      : await supabase.from('areas').insert(payload);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: editingId ? 'Area updated' : 'Area created' }); setDialogOpen(false); fetchAreas(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this area?')) return;
    const { error } = await supabase.from('areas').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Area deleted' }); fetchAreas(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search areas..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={districtFilter} onValueChange={setDistrictFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="District" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Districts</SelectItem>
            {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Area</Button>
      </div>

      <div className="text-sm text-muted-foreground">{areas.length} areas</div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name (EN)</TableHead>
                  <TableHead>Name (BN)</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : areas.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No areas found</TableCell></TableRow>
                ) : areas.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-sm">{a.name_en}</TableCell>
                    <TableCell className="text-sm">{a.name_bn}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{(a.districts as any)?.name_en || '—'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Area' : 'Add Area'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">District *</label>
              <Select value={form.district_id} onValueChange={v => setForm(p => ({ ...p, district_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
                <SelectContent>
                  {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Name (English) *</label>
                <Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} placeholder="e.g. Dhanmondi" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Name (Bangla) *</label>
                <Input value={form.name_bn} onChange={e => setForm(p => ({ ...p, name_bn: e.target.value }))} placeholder="e.g. ধানমন্ডি" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Class Levels Manager (static config) ───
function ClassLevelsManager({ toast }: { toast: any }) {
  // Class levels are stored in a static file. Show them for reference and allow editing the file.
  const [classLevels, setClassLevels] = useState<{ group: string; items: string[] }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [form, setForm] = useState({ group: '', items: '' });

  useEffect(() => {
    // Load from the constant
    import('@/constants/classLevels').then(mod => setClassLevels([...mod.CLASS_LEVELS]));
  }, []);

  const openEdit = (idx: number) => {
    setEditingGroup(idx);
    setForm({ group: classLevels[idx].group, items: classLevels[idx].items.join('\n') });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{classLevels.reduce((s, g) => s + g.items.length, 0)} class levels in {classLevels.length} groups</div>
        <Badge variant="outline" className="text-xs">Read-only — edit src/constants/classLevels.ts</Badge>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classLevels.map((group, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {group.group}
                </span>
                <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {group.items.map((item, i) => (
                  <div key={i} className="text-xs text-muted-foreground py-0.5">{item}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Platform Data Tab ───
export function PlatformDataTab({ toast }: { toast: any }) {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold">Platform Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage subjects, districts, areas, and class levels</p>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Subjects</TabsTrigger>
          <TabsTrigger value="districts" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Districts</TabsTrigger>
          <TabsTrigger value="areas" className="gap-1.5"><Map className="h-3.5 w-3.5" /> Areas</TabsTrigger>
          <TabsTrigger value="classes" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Class Levels</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects"><SubjectsManager toast={toast} /></TabsContent>
        <TabsContent value="districts"><DistrictsManager toast={toast} /></TabsContent>
        <TabsContent value="areas"><AreasManager toast={toast} /></TabsContent>
        <TabsContent value="classes"><ClassLevelsManager toast={toast} /></TabsContent>
        <TabsContent value="settings"><SettingsManager toast={toast} /></TabsContent>
      </Tabs>
    </div>
  );
}
