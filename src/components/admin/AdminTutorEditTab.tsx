import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, GraduationCap, Briefcase, Plus, Trash2, Pencil, CheckCircle2, BookOpen, X, FileText } from 'lucide-react';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';

interface Props {
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

interface Subject { id: string; name_en: string; category_en: string | null; }
interface Education { id: string; institution: string; degree: string; field_of_study: string | null; passing_year: number | null; result: string | null; is_current: boolean; }
interface Experience { id: string; company: string; designation: string; start_date: string | null; end_date: string | null; is_current: boolean; responsibilities: string | null; }

interface TutorResult {
  tutor_id: string;
  user_id: string;
  name: string;
  email: string;
  gender: string;
  experience_years: number;
  verification_status: string;
  bio: string | null;
  featured_blurb: string | null;
}

export function AdminTutorEditTab({ toast }: Props) {
  const [blurb, setBlurb] = useState('');
  const [savingBlurb, setSavingBlurb] = useState(false);
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<TutorResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<TutorResult | null>(null);

  // Tutor data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tutorSubjectIds, setTutorSubjectIds] = useState<string[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [saving, setSaving] = useState(false);

  // Admin notes
  const [adminNotes, setAdminNotes] = useState<{ id: string; category: string; note: string; created_at: string; admin_name: string }[]>([]);
  const [newNoteCategory, setNewNoteCategory] = useState('behavior');
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Edit dialogs
  const [eduDialog, setEduDialog] = useState<Partial<Education> | null>(null);
  const [expDialog, setExpDialog] = useState<Partial<Experience> | null>(null);

  useEffect(() => {
    supabase.from('subjects').select('id, name_en, category_en').order('name_en').then(({ data }) => setSubjects(data || []));
  }, []);

  const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name_en, group: s.category_en || 'Other' }));

  const searchTutors = useCallback(async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data: tutors } = await supabase.from('tutor_profiles')
      .select('id, user_id, gender, experience_years, verification_status, bio, featured_blurb')
      .limit(50);
    if (!tutors) { setResults([]); setSearching(false); return; }
    const userIds = tutors.map(t => t.user_id);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')
      .in('id', userIds)
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const mapped: TutorResult[] = tutors
      .filter(t => profileMap.has(t.user_id))
      .map(t => {
        const p = profileMap.get(t.user_id)!;
        return {
          tutor_id: t.id,
          user_id: t.user_id,
          name: p.full_name,
          email: p.email,
          gender: t.gender,
          experience_years: t.experience_years || 0,
          verification_status: t.verification_status || 'pending',
          bio: t.bio,
          featured_blurb: (t as any).featured_blurb ?? null,
        };
      });
    setResults(mapped);
    setSearching(false);
  }, []);

  const loadAdminNotes = useCallback(async (tutorId: string) => {
    const { data } = await supabase.from('tutor_admin_notes')
      .select('id, category, note, created_at, admin_id')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false });
    if (data && data.length > 0) {
      const adminIds = [...new Set(data.map(n => n.admin_id))];
      const { data: admins } = await supabase.from('profiles').select('id, full_name').in('id', adminIds);
      const adminMap = new Map(admins?.map(a => [a.id, a.full_name]) || []);
      setAdminNotes(data.map(n => ({ ...n, admin_name: adminMap.get(n.admin_id) || 'Admin' })));
    } else {
      setAdminNotes([]);
    }
  }, []);

  const loadTutorData = useCallback(async (tutorId: string) => {
    const [{ data: tsData }, { data: eduData }, { data: expData }] = await Promise.all([
      supabase.from('tutor_subjects').select('subject_id').eq('tutor_profile_id', tutorId),
      supabase.from('tutor_education').select('*').eq('tutor_id', tutorId).order('passing_year', { ascending: false }),
      supabase.from('tutor_job_experiences').select('*').eq('tutor_id', tutorId).order('start_date', { ascending: false }),
    ]);
    setTutorSubjectIds(tsData?.map(s => s.subject_id) || []);
    setEducations(eduData?.map(e => ({ ...e, is_current: e.is_current || false })) || []);
    setExperiences(expData?.map(e => ({ ...e, is_current: e.is_current || false })) || []);
    loadAdminNotes(tutorId);
  }, [loadAdminNotes]);

  const handleAddNote = async () => {
    if (!selectedTutor || !user || !newNoteText.trim()) {
      toast({ title: 'Note Required', description: 'Please enter a note.', variant: 'destructive' });
      return;
    }
    setSavingNote(true);
    const { error } = await supabase.from('tutor_admin_notes').insert({
      tutor_id: selectedTutor.tutor_id,
      admin_id: user.id,
      category: newNoteCategory,
      note: newNoteText.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Note Added' });
      setNewNoteText('');
      loadAdminNotes(selectedTutor.tutor_id);
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedTutor) return;
    await supabase.from('tutor_admin_notes').delete().eq('id', noteId);
    toast({ title: 'Note Deleted' });
    loadAdminNotes(selectedTutor.tutor_id);
  };

  const handleSelectTutor = (t: TutorResult) => {
    setSelectedTutor(t);
    setResults([]);
    setBlurb(t.featured_blurb || '');
    loadTutorData(t.tutor_id);
  };

  const handleSaveBlurb = async () => {
    if (!selectedTutor) return;
    setSavingBlurb(true);
    const value = blurb.trim() || null;
    const { error } = await supabase
      .from('tutor_profiles')
      .update({ featured_blurb: value } as any)
      .eq('id', selectedTutor.tutor_id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Featured blurb saved' });
      setSelectedTutor({ ...selectedTutor, featured_blurb: value });
    }
    setSavingBlurb(false);
  };

  // ─── Subjects ───
  const handleSaveSubjects = async () => {
    if (!selectedTutor) return;
    setSaving(true);
    try {
      await supabase.from('tutor_subjects').delete().eq('tutor_profile_id', selectedTutor.tutor_id);
      if (tutorSubjectIds.length > 0) {
        await supabase.from('tutor_subjects').insert(
          tutorSubjectIds.map(sid => ({ tutor_profile_id: selectedTutor.tutor_id, subject_id: sid }))
        );
      }
      toast({ title: 'Subjects Updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Education CRUD ───
  const handleSaveEducation = async () => {
    if (!selectedTutor || !eduDialog) return;
    setSaving(true);
    try {
      if (!eduDialog.institution?.trim() || !eduDialog.degree?.trim()) {
        toast({ title: 'Missing fields', description: 'Institution and degree are required.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const payload = {
        tutor_id: selectedTutor.tutor_id,
        institution: eduDialog.institution!.trim(),
        degree: eduDialog.degree!.trim(),
        field_of_study: eduDialog.field_of_study?.trim() || null,
        passing_year: eduDialog.passing_year || null,
        result: eduDialog.result?.trim() || null,
        is_current: eduDialog.is_current || false,
      };
      if (eduDialog.id) {
        await supabase.from('tutor_education').update(payload).eq('id', eduDialog.id);
      } else {
        await supabase.from('tutor_education').insert(payload);
      }
      toast({ title: eduDialog.id ? 'Education Updated' : 'Education Added' });
      setEduDialog(null);
      loadTutorData(selectedTutor.tutor_id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    if (!selectedTutor) return;
    await supabase.from('tutor_education').delete().eq('id', id);
    toast({ title: 'Education Removed' });
    loadTutorData(selectedTutor.tutor_id);
  };

  // ─── Experience CRUD ───
  const handleSaveExperience = async () => {
    if (!selectedTutor || !expDialog) return;
    setSaving(true);
    try {
      if (!expDialog.company?.trim() || !expDialog.designation?.trim()) {
        toast({ title: 'Missing fields', description: 'Company and designation are required.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const payload = {
        tutor_id: selectedTutor.tutor_id,
        company: expDialog.company!.trim(),
        designation: expDialog.designation!.trim(),
        start_date: expDialog.start_date || null,
        end_date: expDialog.is_current ? null : (expDialog.end_date || null),
        is_current: expDialog.is_current || false,
        responsibilities: expDialog.responsibilities?.trim() || null,
      };
      if (expDialog.id) {
        await supabase.from('tutor_job_experiences').update(payload).eq('id', expDialog.id);
      } else {
        await supabase.from('tutor_job_experiences').insert(payload);
      }
      toast({ title: expDialog.id ? 'Experience Updated' : 'Experience Added' });
      setExpDialog(null);
      loadTutorData(selectedTutor.tutor_id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!selectedTutor) return;
    await supabase.from('tutor_job_experiences').delete().eq('id', id);
    toast({ title: 'Experience Removed' });
    loadTutorData(selectedTutor.tutor_id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tutor Profile Editor</h1>

      {/* Search */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tutor by name or email..." value={search} onChange={e => searchTutors(e.target.value)} className="pl-9" />
          </div>
          {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
          {results.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map(t => (
                <button key={t.tutor_id} onClick={() => handleSelectTutor(t)}
                  className="w-full flex items-center justify-between p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors text-left">
                  <div>
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{t.gender}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{t.verification_status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedTutor && (
            <div className="flex items-center justify-between p-3 rounded-md border border-primary/30 bg-primary/5">
              <div>
                <p className="font-medium text-sm">{selectedTutor.name}</p>
                <p className="text-xs text-muted-foreground">{selectedTutor.email} · {selectedTutor.gender} · {selectedTutor.experience_years} yrs exp</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setSelectedTutor(null); setSearch(''); setTutorSubjectIds([]); setEducations([]); setExperiences([]); setBlurb(''); }}>Change</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTutor && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Subjects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Subjects</CardTitle>
              <CardDescription>Manage subjects this tutor teaches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MultiSearchableSelect
                options={subjectOptions}
                values={tutorSubjectIds}
                onValuesChange={setTutorSubjectIds}
                placeholder="Select subjects..."
                searchPlaceholder="Search subjects..."
                grouped
              />
              <Button onClick={handleSaveSubjects} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Subjects'}
              </Button>
            </CardContent>
          </Card>

          {/* Bio quick info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Verification</span><Badge variant="outline" className="capitalize">{selectedTutor.verification_status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span>{selectedTutor.experience_years} years</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span className="capitalize">{selectedTutor.gender}</span></div>
              {selectedTutor.bio && <div><span className="text-muted-foreground">Bio:</span><p className="mt-1 text-xs bg-muted/50 p-2 rounded">{selectedTutor.bio}</p></div>}
            </CardContent>
          </Card>

          {/* Featured blurb (manual, shown on public profile) */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Featured Tutor Blurb</CardTitle>
              <CardDescription>A short hand-written highlight (1–3 sentences) shown on this tutor's public profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={blurb}
                onChange={e => setBlurb(e.target.value.slice(0, 500))}
                placeholder="e.g. Top-rated math tutor with 5+ years helping HSC students score A+. Patient, structured, and exam-focused."
                rows={4}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{blurb.length}/500</span>
                <Button size="sm" onClick={handleSaveBlurb} disabled={savingBlurb}>
                  {savingBlurb ? 'Saving...' : 'Save Blurb'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Education</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEduDialog({ institution: '', degree: '', field_of_study: '', passing_year: undefined, result: '', is_current: false })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {educations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No education records</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Degree</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {educations.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm font-medium">{e.institution}</TableCell>
                          <TableCell className="text-sm">{e.degree}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{e.field_of_study || '—'}</TableCell>
                          <TableCell className="text-sm">{e.is_current ? 'Current' : (e.passing_year || '—')}</TableCell>
                          <TableCell className="text-sm">{e.result || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setEduDialog(e)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteEducation(e.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Experience</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setExpDialog({ company: '', designation: '', start_date: '', end_date: '', is_current: false, responsibilities: '' })}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No experience records</p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Responsibilities</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {experiences.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm font-medium">{e.company}</TableCell>
                          <TableCell className="text-sm">{e.designation}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {e.start_date || '?'} → {e.is_current ? 'Present' : (e.end_date || '?')}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{e.responsibilities || '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setExpDialog(e)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteExperience(e.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Admin Notes</CardTitle>
              <CardDescription>Record tutor behavior, character observations, and internal remarks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new note */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={newNoteCategory} onValueChange={setNewNoteCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavior">Behavior</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Write a note about this tutor..."
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddNote} disabled={savingNote || !newNoteText.trim()} className="self-end">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
                </Button>
              </div>

              {/* Notes list */}
              {adminNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes recorded for this tutor</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {adminNotes.map(n => (
                    <div key={n.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-xs capitalize ${
                            n.category === 'complaint' || n.category === 'warning' ? 'border-destructive text-destructive' :
                            n.category === 'positive' ? 'border-success text-success' :
                            n.category === 'behavior' ? 'border-warning text-warning' : ''
                          }`}>{n.category}</Badge>
                          <span className="text-xs text-muted-foreground">by {n.admin_name}</span>
                          <span className="text-xs text-muted-foreground">· {formatExactDate(new Date(n.created_at))}</span>
                        </div>
                        <p className="text-sm">{n.note}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(n.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Education Dialog */}
      <Dialog open={!!eduDialog} onOpenChange={() => setEduDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{eduDialog?.id ? 'Edit Education' : 'Add Education'}</DialogTitle></DialogHeader>
          {eduDialog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Institution *</label>
                <Input value={eduDialog.institution || ''} onChange={e => setEduDialog(p => ({ ...p!, institution: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Degree *</label>
                <Input value={eduDialog.degree || ''} onChange={e => setEduDialog(p => ({ ...p!, degree: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Field of Study</label>
                <Input value={eduDialog.field_of_study || ''} onChange={e => setEduDialog(p => ({ ...p!, field_of_study: e.target.value }))} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Passing Year</label>
                  <Input type="number" value={eduDialog.passing_year || ''} onChange={e => setEduDialog(p => ({ ...p!, passing_year: e.target.value ? Number(e.target.value) : undefined }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Result / GPA</label>
                  <Input value={eduDialog.result || ''} onChange={e => setEduDialog(p => ({ ...p!, result: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={eduDialog.is_current || false} onChange={e => setEduDialog(p => ({ ...p!, is_current: e.target.checked }))} className="rounded" />
                Currently studying here
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEduDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveEducation} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Experience Dialog */}
      <Dialog open={!!expDialog} onOpenChange={() => setExpDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{expDialog?.id ? 'Edit Experience' : 'Add Experience'}</DialogTitle></DialogHeader>
          {expDialog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company *</label>
                <Input value={expDialog.company || ''} onChange={e => setExpDialog(p => ({ ...p!, company: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Designation *</label>
                <Input value={expDialog.designation || ''} onChange={e => setExpDialog(p => ({ ...p!, designation: e.target.value }))} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={expDialog.start_date || ''} onChange={e => setExpDialog(p => ({ ...p!, start_date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" value={expDialog.end_date || ''} onChange={e => setExpDialog(p => ({ ...p!, end_date: e.target.value }))} className="mt-1" disabled={expDialog.is_current} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={expDialog.is_current || false} onChange={e => setExpDialog(p => ({ ...p!, is_current: e.target.checked }))} className="rounded" />
                Currently working here
              </label>
              <div>
                <label className="text-sm font-medium">Responsibilities</label>
                <Textarea value={expDialog.responsibilities || ''} onChange={e => setExpDialog(p => ({ ...p!, responsibilities: e.target.value }))} className="mt-1" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveExperience} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
