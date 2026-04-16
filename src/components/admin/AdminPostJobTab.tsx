import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Search, CheckCircle2, Clock } from 'lucide-react';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';

interface Props {
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

interface District { id: string; name_en: string; division_en: string; }
interface Area { id: string; name_en: string; district_id: string; }
interface Subject { id: string; name_en: string; category_en: string | null; }
interface ParentResult { id: string; full_name: string; email: string; phone: string | null; }

export function AdminPostJobTab({ toast }: Props) {
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<ParentResult[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentResult | null>(null);
  const [searching, setSearching] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [classLevel, setClassLevel] = useState('');
  const [teachingMode, setTeachingMode] = useState<'in_person' | 'online' | 'hybrid'>('in_person');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [preferredTutorGender, setPreferredTutorGender] = useState<'any' | 'male' | 'female'>('any');
  const [numberOfStudents, setNumberOfStudents] = useState('1');
  const [locationDetails, setLocationDetails] = useState('');

  const [posting, setPosting] = useState(false);
  const [postedJobs, setPostedJobs] = useState<{ title: string; parent: string; ref: string; date: string }[]>([]);

  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('districts').select('id, name_en, division_en').order('name_en'),
      supabase.from('areas').select('id, name_en, district_id').order('name_en'),
      supabase.from('subjects').select('id, name_en, category_en').order('name_en'),
    ]).then(([d, a, s]) => {
      setDistricts(d.data || []);
      setAreas(a.data || []);
      setSubjects(s.data || []);
    });
  }, []);

  const divisions = [...new Set(districts.map(d => d.division_en))].sort();
  const filteredDistricts = selectedDivision ? districts.filter(d => d.division_en === selectedDivision) : [];
  const filteredAreas = districtId ? areas.filter(a => a.district_id === districtId) : [];

  const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name_en, group: s.category_en || 'Other' }));

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

  const resetForm = () => {
    setTitle(''); setDescription(''); setSelectedDivision(''); setDistrictId(''); setAreaId('');
    setSelectedSubjectIds([]); setClassLevel(''); setTeachingMode('in_person'); setBudgetMin(''); setBudgetMax('');
    setDaysPerWeek(''); setDurationHours(''); setPreferredTime(''); setPreferredTutorGender('any');
    setNumberOfStudents('1'); setLocationDetails('');
  };

  const handlePost = async () => {
    if (!selectedParent) {
      toast({ title: 'Select Parent', description: 'Search and select a parent first.', variant: 'destructive' });
      return;
    }
    if (!title.trim() || !description.trim() || !districtId) {
      toast({ title: 'Missing fields', description: 'Title, description, and district are required.', variant: 'destructive' });
      return;
    }

    setPosting(true);
    try {
      const { data, error } = await supabase.from('jobs').insert({
        parent_id: selectedParent.id,
        title: title.trim(),
        description: description.trim(),
        district_id: districtId,
        area_id: areaId || null,
        subject_id: selectedSubjectIds.length > 0 ? selectedSubjectIds[0] : null,
        class_level: classLevel || null,
        teaching_mode: teachingMode,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        days_per_week: daysPerWeek ? Number(daysPerWeek) : null,
        duration_hours: durationHours ? Number(durationHours) : null,
        preferred_time: preferredTime || null,
        preferred_tutor_gender: preferredTutorGender,
        number_of_students: Number(numberOfStudents) || 1,
        location_details: locationDetails || null,
        status: 'open',
      }).select('id, job_reference').single();

      if (error) throw error;

      // Insert additional subjects into job_subjects
      if (selectedSubjectIds.length > 0) {
        const jobSubjects = selectedSubjectIds.map(sid => ({ job_id: data.id, subject_id: sid }));
        await supabase.from('job_subjects').insert(jobSubjects);
      }

      toast({ title: 'Job Posted!', description: `Job "${title}" posted for ${selectedParent.full_name}. Ref: ${data.job_reference}` });
      setPostedJobs(prev => [{ title, parent: selectedParent.full_name, ref: data.job_reference || '', date: new Date().toISOString() }, ...prev]);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Post Job (On Behalf of Parent)</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Parent Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Parent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parent by name, email, or phone..."
                  value={parentSearch}
                  onChange={e => searchParents(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
              {parentResults.length > 0 && !selectedParent && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {parentResults.map(p => (
                    <button key={p.id} onClick={() => { setSelectedParent(p); setParentResults([]); }}
                      className="w-full flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/50 transition-colors text-left">
                      <div>
                        <span className="font-medium text-sm">{p.full_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedParent && (
                <div className="flex items-center justify-between p-3 rounded-md border border-primary/30 bg-primary/5">
                  <div>
                    <p className="font-medium text-sm">{selectedParent.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedParent.email} · {selectedParent.phone || 'No phone'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedParent(null); setParentSearch(''); }}>Change</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" placeholder="e.g. English Tutor Needed for Class 8" />
              </div>
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1" rows={4} placeholder="Describe the tutoring requirements..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Subjects (Multi-select)</label>
                  <MultiSearchableSelect
                    options={subjectOptions}
                    values={selectedSubjectIds}
                    onValuesChange={setSelectedSubjectIds}
                    placeholder="Select subjects..."
                    searchPlaceholder="Search subjects..."
                    grouped
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Class Level</label>
                  <Input value={classLevel} onChange={e => setClassLevel(e.target.value)} className="mt-1" placeholder="e.g. Class 8" />
                </div>
              </div>

              {/* Division → District → Area */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Division *</label>
                  <Select value={selectedDivision} onValueChange={v => { setSelectedDivision(v); setDistrictId(''); setAreaId(''); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Division" /></SelectTrigger>
                    <SelectContent>
                      {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">District *</label>
                  <Select value={districtId} onValueChange={v => { setDistrictId(v); setAreaId(''); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="District" /></SelectTrigger>
                    <SelectContent>
                      {filteredDistricts.map(d => <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Area</label>
                  <Select value={areaId} onValueChange={setAreaId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Area" /></SelectTrigger>
                    <SelectContent>
                      {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.name_en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Teaching Mode</label>
                  <Select value={teachingMode} onValueChange={v => setTeachingMode(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Preferred Tutor Gender</label>
                  <Select value={preferredTutorGender} onValueChange={v => setPreferredTutorGender(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Budget Min (৳)</label>
                  <Input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Budget Max (৳)</label>
                  <Input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Days/Week</label>
                  <Input type="number" value={daysPerWeek} onChange={e => setDaysPerWeek(e.target.value)} className="mt-1" min={1} max={7} />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (hrs)</label>
                  <Input type="number" value={durationHours} onChange={e => setDurationHours(e.target.value)} className="mt-1" step={0.5} />
                </div>
                <div>
                  <label className="text-sm font-medium">Students</label>
                  <Input type="number" value={numberOfStudents} onChange={e => setNumberOfStudents(e.target.value)} className="mt-1" min={1} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Preferred Time</label>
                <Input value={preferredTime} onChange={e => setPreferredTime(e.target.value)} className="mt-1" placeholder="e.g. Evening 5-7 PM" />
              </div>
              <div>
                <label className="text-sm font-medium">Location Details</label>
                <Textarea value={locationDetails} onChange={e => setLocationDetails(e.target.value)} className="mt-1" rows={2} placeholder="Specific address..." />
              </div>

              <Button className="w-full" onClick={handlePost} disabled={posting || !selectedParent}>
                {posting ? <><Clock className="h-4 w-4 mr-2 animate-spin" /> Posting...</> : 'Post Job'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recently Posted */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Recently Posted</CardTitle>
            <CardDescription>Jobs posted this session</CardDescription>
          </CardHeader>
          <CardContent>
            {postedJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No jobs posted yet</p>
            ) : (
              <div className="space-y-3">
                {postedJobs.map((j, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span className="font-medium text-sm truncate">{j.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">For: {j.parent}</p>
                    <Badge variant="outline" className="text-xs font-mono">{j.ref}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
