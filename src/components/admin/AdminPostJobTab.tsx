import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle2, Clock, Plus, XCircle } from 'lucide-react';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { SearchableSelect } from '@/components/SearchableSelect';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { SPECIAL_REQUIREMENTS } from '@/constants/specialRequirements';
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';

interface Props {
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

interface District { id: string; name_en: string; name_bn: string; division_en: string; division_bn: string; }
interface Area { id: string; name_en: string; district_id: string; }
interface Subject { id: string; name_en: string; category_en: string | null; }
interface ParentResult { id: string; full_name: string; email: string; phone: string | null; }

export function AdminPostJobTab({ toast }: Props) {
  const [showPostJob, setShowPostJob] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postedJobs, setPostedJobs] = useState<{ title: string; parent: string; ref: string; date: string }[]>([]);

  // Parent selection (inside dialog)
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<ParentResult[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentResult | null>(null);
  const [searching, setSearching] = useState(false);
  // Manual phone/email entry when parent not found

  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedJobDivision, setSelectedJobDivision] = useState('');
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    subject_ids: [] as string[],
    district_id: '',
    area_id: '',
    class_levels: [] as string[],
    category: '',
    background: '',
    days_per_week: 3,
    duration_hours: 1.5,
    budget_min: 3000,
    budget_max: 8000,
    teaching_mode: 'in_person',
    preferred_tutor_gender: 'any',
    student_gender: 'any',
    special_requirements: [] as string[],
    preferred_time: '',
    fixed_time: '',
    number_of_students: 1,
    student_age: '',
    student_school_name: '',
    start_date: '',
    location_details: '',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('districts').select('id, name_en, name_bn, division_en, division_bn').order('name_en'),
      supabase.from('areas').select('id, name_en, district_id').order('name_en'),
      supabase.from('subjects').select('id, name_en, category_en').order('name_en'),
    ]).then(([d, a, s]) => {
      setDistricts(d.data || []);
      setAreas(a.data || []);
      setSubjects(s.data || []);
    });
  }, []);

  const jobDivisions = useMemo(() => {
    const divSet = new Map<string, string>();
    districts.forEach(d => {
      if (!divSet.has(d.division_en)) divSet.set(d.division_en, d.division_bn);
    });
    return Array.from(divSet.entries()).map(([en]) => ({ en })).sort((a, b) => a.en.localeCompare(b.en));
  }, [districts]);

  const districtOptions = useMemo(() => {
    const filtered = selectedJobDivision ? districts.filter(d => d.division_en === selectedJobDivision) : districts;
    return filtered.map(d => ({ value: d.id, label: d.name_en })).sort((a, b) => a.label.localeCompare(b.label));
  }, [districts, selectedJobDivision]);

  const subjectOptions = useMemo(() => subjects.map(s => ({
    value: s.id, label: s.name_en, group: s.category_en || 'Other',
  })), [subjects]);

  const areaOptions = useMemo(() => {
    const filtered = jobForm.district_id ? areas.filter(a => a.district_id === jobForm.district_id) : areas;
    return filtered.map(a => ({ value: a.id, label: a.name_en })).sort((a, b) => a.label.localeCompare(b.label));
  }, [areas, jobForm.district_id]);

  const classLevelOptions = useMemo(() => CLASS_LEVELS.flatMap(group =>
    group.items.map(item => ({ value: item, label: item, group: group.group }))
  ), []);

  const searchParents = useCallback(async (q: string) => {
    setParentSearch(q);
    if (q.length < 2) { setParentResults([]); return; }
    setSearching(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'parent');
    if (!roles || roles.length === 0) { setParentResults([]); setSearching(false); return; }
    const parentIds = roles.map(r => r.user_id);
    const { data } = await supabase.from('profiles').select('id, full_name, email, phone')
      .in('id', parentIds)
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(10);
    setParentResults(data || []);
    setSearching(false);
  }, []);

  const resetAll = () => {
    setSelectedJobDivision('');
    setPrefilled(false);
    setSelectedParent(null);
    setParentSearch('');
    setParentResults([]);
    setJobForm({
      title: '', description: '', subject_ids: [], district_id: '', area_id: '', class_levels: [],
      category: '', background: '', days_per_week: 3, duration_hours: 1.5, budget_min: 3000, budget_max: 8000,
      teaching_mode: 'in_person', preferred_tutor_gender: 'any', student_gender: 'any',
      special_requirements: [], preferred_time: '', fixed_time: '', number_of_students: 1, student_age: '', student_school_name: '', start_date: '', location_details: '',
    });
  };

  const prefillFromParentLastJob = async (parentId: string) => {
    const { data: lastJob } = await supabase.from('jobs')
      .select('district_id, area_id, location_details, student_school_name, student_age, student_gender, number_of_students, teaching_mode, preferred_tutor_gender, days_per_week, duration_hours, budget_min, budget_max, preferred_time, special_requirements, class_level')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastJob) {
      const district = districts.find(d => d.id === lastJob.district_id);
      if (district) setSelectedJobDivision(district.division_en);
      setJobForm(prev => ({
        ...prev,
        district_id: lastJob.district_id || '',
        area_id: lastJob.area_id || '',
        location_details: lastJob.location_details || '',
        student_school_name: lastJob.student_school_name || '',
        student_age: lastJob.student_age || '',
        student_gender: lastJob.student_gender || 'any',
        number_of_students: lastJob.number_of_students || 1,
        teaching_mode: lastJob.teaching_mode || 'in_person',
        preferred_tutor_gender: lastJob.preferred_tutor_gender || 'any',
        days_per_week: lastJob.days_per_week || 3,
        duration_hours: lastJob.duration_hours ? Number(lastJob.duration_hours) : 1.5,
        budget_min: lastJob.budget_min || 3000,
        budget_max: lastJob.budget_max || 8000,
        preferred_time: lastJob.preferred_time || '',
        special_requirements: lastJob.special_requirements ? lastJob.special_requirements.split(', ') : [],
        class_levels: lastJob.class_level ? lastJob.class_level.split(', ') : [],
      }));
      setPrefilled(true);
    }
  };

  const normalizeBDPhone = (raw: string): string | null => {
    const digits = raw.replace(/[\s\-()]/g, '');
    // +8801XXXXXXXXX or 8801XXXXXXXXX or 01XXXXXXXXX
    const match = digits.match(/^(?:\+?880)?(1[3-9]\d{8})$/);
    return match ? `+880${match[1]}` : null;
  };

  const resolveOrCreateParent = async (): Promise<string | null> => {
    if (selectedParent) return selectedParent.id;

    const raw = parentSearch.trim();
    if (!raw) {
      toast({ title: 'Guardian Required', description: 'Search a guardian by phone number or select an existing one.', variant: 'destructive' });
      return null;
    }

    // Check if input looks like a phone number (starts with 0, +, or 8)
    const looksLikePhone = /^[+0-9]/.test(raw);
    if (!looksLikePhone) {
      toast({ title: 'Invalid Input', description: 'Enter a valid Bangladesh phone number (01XXX-XXXXXX) to auto-create a guardian.', variant: 'destructive' });
      return null;
    }

    const phone = normalizeBDPhone(raw);
    if (!phone) {
      toast({ title: 'Invalid Phone', description: 'Please enter a valid Bangladesh phone number (01XXX-XXXXXX).', variant: 'destructive' });
      return null;
    }

    // Try to find existing profile by phone
    const { data: byPhone } = await supabase.from('profiles').select('id').eq('phone', phone).maybeSingle();
    if (byPhone) {
      await supabase.from('user_roles').upsert({ user_id: byPhone.id, role: 'parent' }, { onConflict: 'user_id,role' });
      return byPhone.id;
    }

    // Create new profile with phone
    const newId = crypto.randomUUID();
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: newId,
      full_name: 'Guardian',
      email: `guardian-${newId.slice(0, 8)}@placeholder.local`,
      phone,
    });
    if (profileErr) {
      toast({ title: 'Error', description: profileErr.message, variant: 'destructive' });
      return null;
    }

    const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: newId, role: 'parent' });
    if (roleErr) {
      toast({ title: 'Error', description: roleErr.message, variant: 'destructive' });
      return null;
    }

    return newId;
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone is present (either from selected parent or manual)
    if (!selectedParent && !parentSearch.trim()) {
      toast({ title: 'Guardian Required', description: 'Search a guardian by phone number or select an existing one.', variant: 'destructive' });
      return;
    }

    if (!jobForm.title.trim() || !jobForm.description.trim() || !jobForm.district_id) {
      toast({ title: 'Missing fields', description: 'Title, description, and district are required.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const parentId = await resolveOrCreateParent();
      if (!parentId) { setSubmitting(false); return; }

      const { data, error } = await supabase.from('jobs').insert({
        parent_id: parentId,
        title: jobForm.title.trim(),
        description: jobForm.description.trim(),
        district_id: jobForm.district_id,
        area_id: jobForm.area_id || null,
        subject_id: jobForm.subject_ids.length > 0 ? jobForm.subject_ids[0] : null,
        class_level: jobForm.class_levels.length > 0 ? jobForm.class_levels.join(', ') : null,
        teaching_mode: jobForm.teaching_mode as 'online' | 'in_person' | 'hybrid',
        budget_min: jobForm.budget_min || null,
        budget_max: jobForm.budget_max || null,
        days_per_week: jobForm.days_per_week || null,
        duration_hours: jobForm.duration_hours || null,
        preferred_time: jobForm.preferred_time || null,
        fixed_time: jobForm.fixed_time || null,
        preferred_tutor_gender: jobForm.preferred_tutor_gender as 'male' | 'female' | 'any',
        student_gender: jobForm.student_gender as 'male' | 'female' | 'any',
        special_requirements: jobForm.special_requirements.length > 0 ? jobForm.special_requirements.join(', ') : null,
        number_of_students: jobForm.number_of_students || 1,
        student_age: jobForm.student_age || null,
        student_school_name: jobForm.student_school_name || null,
        start_date: jobForm.start_date || null,
        location_details: jobForm.location_details || null,
        status: 'open',
      }).select('id, job_reference').single();

      if (error) throw error;

      if (jobForm.subject_ids.length > 0) {
        await supabase.from('job_subjects').insert(
          jobForm.subject_ids.map(sid => ({ job_id: data.id, subject_id: sid }))
        );
      }

      const parentLabel = selectedParent?.full_name || parentSearch.trim();
      toast({ title: 'Job Posted!', description: `Job "${jobForm.title}" posted. Ref: ${data.job_reference}` });
      setPostedJobs(prev => [{ title: jobForm.title, parent: parentLabel, ref: data.job_reference || '', date: new Date().toISOString() }, ...prev]);
      resetAll();
      setShowPostJob(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const hasParent = !!selectedParent || parentSearch.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Post Job</h1>
        <Button onClick={() => setShowPostJob(true)}>
          <Plus className="h-4 w-4 mr-2" /> Post New Job
        </Button>
      </div>

      {/* Recently Posted */}
      {postedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Posted</CardTitle>
            <CardDescription>Jobs posted this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {postedJobs.map((j, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="font-medium text-sm truncate">{j.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">For: {j.parent}</p>
                  <Badge variant="outline" className="text-xs font-mono">{j.ref}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post Job Dialog */}
      <Dialog open={showPostJob} onOpenChange={(open) => {
        setShowPostJob(open);
        if (!open) resetAll();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Tuition Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePost} className="space-y-5 mt-4">

            {/* Section: Guardian / Parent */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardian Information</p>
              <div className="h-px bg-border" />
            </div>

            {!selectedParent ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by phone, name, or email..."
                    value={parentSearch}
                    onChange={e => searchParents(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
                {parentResults.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-1">
                    {parentResults.map(p => (
                      <button type="button" key={p.id} onClick={() => { setSelectedParent(p); setParentResults([]); setParentSearch(''); prefillFromParentLastJob(p.id); }}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors text-left">
                        <div>
                          <span className="font-medium text-sm">{p.full_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.phone || p.email}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {parentSearch.length >= 2 && !searching && parentResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">No guardian found. The phone number entered above will be used to auto-create a guardian profile on save.</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-md border border-primary/30 bg-primary/5">
                <div>
                  <p className="text-xs text-muted-foreground">Guardian:</p>
                  <p className="font-medium text-sm">{selectedParent.full_name} · {selectedParent.phone || selectedParent.email}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedParent(null); setParentSearch(''); }}>Change</Button>
              </div>
            )}

            {prefilled && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-accent/50 border border-accent text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Previous job data loaded — update as needed</span>
              </div>
            )}

            {/* Section: Basic Info */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</p>
              <div className="h-px bg-border" />
            </div>
            <div>
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g., Math Tutor Needed for Class 10 Student"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe your requirements, schedule preferences, learning goals, etc."
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                required
                rows={4}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <div className="flex gap-2">
                  <Select value={jobForm.category} onValueChange={(v) => setJobForm({ ...jobForm, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {jobForm.category && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setJobForm({ ...jobForm, category: '' })} title="Clear category">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Background</Label>
                <div className="flex gap-2">
                  <Select value={jobForm.background} onValueChange={(v) => setJobForm({ ...jobForm, background: v })}>
                    <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
                    <SelectContent>
                      {STUDENT_BACKGROUNDS.map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {jobForm.background && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setJobForm({ ...jobForm, background: '' })} title="Clear background">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Subjects *</Label>
                <MultiSearchableSelect
                  options={subjectOptions}
                  values={jobForm.subject_ids}
                  onValuesChange={(v) => setJobForm({ ...jobForm, subject_ids: v })}
                  placeholder="Select subjects..."
                  searchPlaceholder="Type to search subjects..."
                  emptyText="No subjects found."
                />
              </div>
              <div>
                <Label>Class Level(s)</Label>
                <MultiSearchableSelect
                  options={classLevelOptions}
                  values={jobForm.class_levels}
                  onValuesChange={(v) => setJobForm({ ...jobForm, class_levels: v })}
                  placeholder="Select class levels..."
                  searchPlaceholder="Type to search..."
                  emptyText="No class levels found."
                  grouped
                />
              </div>
            </div>

            {/* Section: Student Details */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Details</p>
              <div className="h-px bg-border" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Number of Students</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={jobForm.number_of_students}
                  onChange={(e) => setJobForm({ ...jobForm, number_of_students: Math.max(1, Number(e.target.value) || 1) })}
                  placeholder="Type number of students"
                />
              </div>
              <div>
                <Label>Student Age (Optional)</Label>
                <Input
                  placeholder="e.g., 12 years"
                  value={jobForm.student_age}
                  onChange={(e) => setJobForm({ ...jobForm, student_age: e.target.value })}
                />
              </div>
              <div>
                <Label>Student School Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g., Dhaka Residential Model College"
                  value={jobForm.student_school_name}
                  onChange={(e) => setJobForm({ ...jobForm, student_school_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Student Gender</Label>
                <Select value={jobForm.student_gender} onValueChange={(v) => setJobForm({ ...jobForm, student_gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section: Schedule & Budget */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule & Budget</p>
              <div className="h-px bg-border" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Days per Week</Label>
                <Select value={String(jobForm.days_per_week)} onValueChange={(v) => setJobForm({ ...jobForm, days_per_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} day{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration per Session</Label>
                <Select value={String(jobForm.duration_hours)} onValueChange={(v) => setJobForm({ ...jobForm, duration_hours: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="1.5">1.5 hours</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="2.5">2.5 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferred Time</Label>
                <Select value={jobForm.preferred_time} onValueChange={(v) => setJobForm({ ...jobForm, preferred_time: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select preferred time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flexible / Anytime">Flexible / Anytime</SelectItem>
                    <SelectItem value="Morning (6 AM – 9 AM)">Morning (6 AM – 9 AM)</SelectItem>
                    <SelectItem value="Late Morning (9 AM – 12 PM)">Late Morning (9 AM – 12 PM)</SelectItem>
                    <SelectItem value="Afternoon (12 PM – 4 PM)">Afternoon (12 PM – 4 PM)</SelectItem>
                    <SelectItem value="After Evening (Anytime)">After Evening (Anytime)</SelectItem>
                    <SelectItem value="Evening (4 PM – 7 PM)">Evening (4 PM – 7 PM)</SelectItem>
                    <SelectItem value="Night (7 PM – 10 PM)">Night (7 PM – 10 PM)</SelectItem>
                    <SelectItem value="Weekends Only">Weekends Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Fixed Time (Optional)</Label>
                <Input
                  type="time"
                  value={jobForm.fixed_time}
                  onChange={(e) => setJobForm({ ...jobForm, fixed_time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Specific clock time, e.g. 5:00 PM.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Budget Min (৳/month)</Label>
                <Input
                  type="number"
                  value={jobForm.budget_min}
                  onChange={(e) => setJobForm({ ...jobForm, budget_min: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Budget Max (৳/month)</Label>
                <Input
                  type="number"
                  value={jobForm.budget_max}
                  onChange={(e) => setJobForm({ ...jobForm, budget_max: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={jobForm.start_date}
                  onChange={(e) => setJobForm({ ...jobForm, start_date: e.target.value })}
                />
              </div>
            </div>

            {/* Section: Location & Teaching */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location & Teaching Preferences</p>
              <div className="h-px bg-border" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Division *</Label>
                <Select value={selectedJobDivision} onValueChange={(v) => { setSelectedJobDivision(v); setJobForm({ ...jobForm, district_id: '', area_id: '' }); }}>
                  <SelectTrigger><SelectValue placeholder="Select Division" /></SelectTrigger>
                  <SelectContent>
                    {jobDivisions.map(div => (
                      <SelectItem key={div.en} value={div.en}>{div.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>District *</Label>
                <SearchableSelect
                  options={districtOptions}
                  value={jobForm.district_id}
                  onValueChange={(v) => setJobForm({ ...jobForm, district_id: v, area_id: '' })}
                  placeholder={selectedJobDivision ? "Search district..." : "Select division first"}
                  searchPlaceholder="Type to search districts..."
                  emptyText="No districts found."
                />
              </div>
              <div>
                <Label>Thana/Upazila (Optional)</Label>
                <SearchableSelect
                  options={areaOptions}
                  value={jobForm.area_id}
                  onValueChange={(v) => setJobForm({ ...jobForm, area_id: v })}
                  placeholder={jobForm.district_id ? "Search thana/upazila..." : "Select district first"}
                  searchPlaceholder="Type to search areas..."
                  emptyText="No areas found."
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Teaching Mode</Label>
                <Select value={jobForm.teaching_mode} onValueChange={(v) => setJobForm({ ...jobForm, teaching_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preferred Tutor Gender</Label>
                <Select value={jobForm.preferred_tutor_gender} onValueChange={(v) => setJobForm({ ...jobForm, preferred_tutor_gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {jobForm.teaching_mode !== 'online' && (
              <div>
                <Label>Location Details (Optional)</Label>
                <Input
                  placeholder="e.g., House 12, Road 5, Dhanmondi, Dhaka"
                  value={jobForm.location_details}
                  onChange={(e) => setJobForm({ ...jobForm, location_details: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Specific address for in-person tutoring (shared only with selected tutor)</p>
              </div>
            )}

            {/* Section: Special Requirements */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Requirements (Optional)</p>
              <div className="h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SPECIAL_REQUIREMENTS.map((req) => (
                <label key={req} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={jobForm.special_requirements.includes(req)}
                    onCheckedChange={(checked) => {
                      setJobForm(prev => ({
                        ...prev,
                        special_requirements: checked
                          ? [...prev.special_requirements, req]
                          : prev.special_requirements.filter(r => r !== req)
                      }));
                    }}
                  />
                  {req}
                </label>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !hasParent}>
              {submitting ? <><Clock className="h-4 w-4 mr-2 animate-spin" /> Posting...</> : 'Post Job'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
