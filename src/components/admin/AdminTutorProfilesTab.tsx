import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { JOB_CATEGORIES } from '@/constants/jobCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Search, GraduationCap, Send, Filter, Eye, Pencil,
  Loader2, Bell, X, LogIn, Ban, CheckCircle2, ShieldOff, ShieldCheck, Download
} from 'lucide-react';
import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface Props {
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  onImpersonate?: (userId: string) => void;
}

interface TutorRow {
  tutor_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  gender: string;
  district_name: string | null;
  area_name: string | null;
  area_id: string | null;
  district_id: string | null;
  education: string | null;
  last_education: string | null;
  experience_years: number;
  teaching_mode: string | null;
  verification_status: string;
  is_available: boolean;
  average_rating: number | null;
  class_levels: string[] | null;
  user_reference: string | null;
  created_at: string;
  is_approved: boolean;
  is_banned: boolean;
}

interface AreaRow { id: string; name_en: string; district_id: string; }
interface DistrictRow { id: string; name_en: string; }
interface JobRow { id: string; title: string; job_reference: string | null; status: string | null; }

export function AdminTutorProfilesTab({ toast, onImpersonate }: Props) {
  // ─── Filters ───
  const [search, setSearch] = useState('');
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState('all');
  const [filterMedium, setFilterMedium] = useState('all');
  const [filterEducation, setFilterEducation] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [filterClassLevel, setFilterClassLevel] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLastEducation, setFilterLastEducation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Data ───
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ─── Selection ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // ─── Notification Dialog ───
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [notifyMode, setNotifyMode] = useState<'selected' | 'filtered'>('selected');
  const [notifyJobCategory, setNotifyJobCategory] = useState('all');
  const [notifySelectedJobs, setNotifySelectedJobs] = useState<string[]>([]);
  const [availableJobs, setAvailableJobs] = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // ─── Ban Confirmation Dialog ───
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUserId, setBanTargetUserId] = useState<string | null>(null);
  const [banTargetName, setBanTargetName] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banProcessing, setBanProcessing] = useState(false);

  // ─── Education & subject data ───
  const [educationOptions, setEducationOptions] = useState<string[]>([]);
  const [universityOptions, setUniversityOptions] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name_en: string; category_en: string | null }[]>([]);

  useEffect(() => {
    supabase.from('districts').select('id, name_en').order('name_en').then(({ data }) => setDistricts(data || []));
    supabase.from('areas').select('id, name_en, district_id').order('name_en').then(({ data }) => setAreas(data || []));
    supabase.from('subjects').select('id, name_en, category_en').order('name_en').then(({ data }) => setSubjects(data || []));
    supabase.from('tutor_education').select('degree, institution').limit(500).then(({ data }) => {
      if (data) {
        setEducationOptions([...new Set(data.map(d => d.degree).filter(Boolean))].sort());
        setUniversityOptions([...new Set(data.map(d => d.institution).filter(Boolean))].sort());
      }
    });
  }, []);

  const districtMap = useMemo(() => new Map(districts.map(d => [d.id, d.name_en])), [districts]);
  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name_en])), [areas]);
  const subjectCategories = useMemo(() => [...new Set(subjects.map(s => s.category_en).filter(Boolean))] as string[], [subjects]);
  const filteredSubjects = useMemo(() =>
    filterCategory !== 'all' ? subjects.filter(s => s.category_en === filterCategory) : subjects,
    [subjects, filterCategory]
  );

  // Area options for MultiSearchableSelect
  const areaOptions = useMemo(() =>
    areas.map(a => ({
      value: a.id,
      label: a.name_en,
      group: districtMap.get(a.district_id) || 'Unknown',
    })),
    [areas, districtMap]
  );

  // ─── Fetch jobs for notification dialog ───
  const fetchJobsForNotify = useCallback(async () => {
    setJobsLoading(true);
    let query = supabase.from('jobs').select('id, title, job_reference, status').order('created_at', { ascending: false }).limit(100);
    if (notifyJobCategory !== 'all') {
      query = query.eq('class_level', notifyJobCategory);
    }
    const { data } = await query;
    setAvailableJobs(data || []);
    setJobsLoading(false);
  }, [notifyJobCategory]);

  useEffect(() => {
    if (notifyDialogOpen) fetchJobsForNotify();
  }, [notifyDialogOpen, fetchJobsForNotify]);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setSelectAll(false);

    let query = supabase
      .from('tutor_profiles')
      .select('id, user_id, gender, education, experience_years, teaching_mode, verification_status, is_available, average_rating, class_levels, district_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterGender !== 'all') query = query.eq('gender', filterGender as any);
    if (filterVerification !== 'all') query = query.eq('verification_status', filterVerification as any);
    if (filterAvailability !== 'all') query = query.eq('is_available', filterAvailability === 'available');
    if (filterMedium !== 'all') query = query.eq('teaching_mode', filterMedium as any);

    // Multi-area filter: narrow by district_ids server-side
    if (filterAreas.length > 0) {
      const districtIds = [...new Set(filterAreas.map(aId => areas.find(a => a.id === aId)?.district_id).filter(Boolean))] as string[];
      if (districtIds.length > 0) query = query.in('district_id', districtIds);
    }

    const { data: tutorData } = await query;
    if (!tutorData) { setTutors([]); setLoading(false); return; }

    const userIds = [...new Set(tutorData.map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, user_reference, is_approved, is_banned, area_id')
      .in('id', userIds);
    const profMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Education filter
    let tutorIdsByEdu = new Set<string>();
    let hasEduFilter = false;
    if (filterEducation || filterUniversity) {
      hasEduFilter = true;
      let eduQuery = supabase.from('tutor_education').select('tutor_id, degree, institution');
      if (filterEducation) eduQuery = eduQuery.ilike('degree', `%${filterEducation}%`);
      if (filterUniversity) eduQuery = eduQuery.ilike('institution', `%${filterUniversity}%`);
      const { data: eduData } = await eduQuery;
      tutorIdsByEdu = new Set(eduData?.map(e => e.tutor_id) || []);
    }

    // Subject filter
    let tutorIdsBySubject = new Set<string>();
    let hasSubjectFilter = false;
    if (filterSubject !== 'all') {
      hasSubjectFilter = true;
      const { data: tsData } = await supabase.from('tutor_subjects').select('tutor_profile_id').eq('subject_id', filterSubject);
      tutorIdsBySubject = new Set(tsData?.map(s => s.tutor_profile_id) || []);
    } else if (filterCategory !== 'all') {
      hasSubjectFilter = true;
      const catSubjectIds = subjects.filter(s => s.category_en === filterCategory).map(s => s.id);
      if (catSubjectIds.length > 0) {
        const { data: tsData } = await supabase.from('tutor_subjects').select('tutor_profile_id').in('subject_id', catSubjectIds);
        tutorIdsBySubject = new Set(tsData?.map(s => s.tutor_profile_id) || []);
      }
    }

    let result: TutorRow[] = tutorData.map(t => {
      const prof = profMap.get(t.user_id);
      return {
        tutor_id: t.id,
        user_id: t.user_id,
        name: prof?.full_name || 'Unknown',
        email: prof?.email || '',
        phone: prof?.phone || null,
        avatar_url: prof?.avatar_url || null,
        gender: t.gender,
        district_name: t.district_id ? districtMap.get(t.district_id) || null : null,
        area_name: prof?.area_id ? areaMap.get(prof.area_id) || null : null,
        area_id: prof?.area_id || null,
        district_id: t.district_id,
        education: t.education,
        last_education: null,
        experience_years: t.experience_years || 0,
        teaching_mode: t.teaching_mode,
        verification_status: t.verification_status || 'pending',
        is_available: t.is_available ?? true,
        average_rating: t.average_rating,
        class_levels: t.class_levels,
        user_reference: prof?.user_reference || null,
        created_at: t.created_at || '',
        is_approved: prof?.is_approved ?? false,
        is_banned: prof?.is_banned ?? false,
      };
    });

    if (hasEduFilter) result = result.filter(t => tutorIdsByEdu.has(t.tutor_id));
    if (hasSubjectFilter) result = result.filter(t => tutorIdsBySubject.has(t.tutor_id));

    // Class level filter
    if (filterClassLevel !== 'all') {
      result = result.filter(t => t.class_levels?.includes(filterClassLevel));
    }

    // Multi-area filter client-side
    if (filterAreas.length > 0) {
      result = result.filter(t => t.area_id && filterAreas.includes(t.area_id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q)) ||
        (t.user_reference && t.user_reference.toLowerCase().includes(q))
      );
    }

    // Compute last_education (highest degree) for displayed tutors
    const DEGREE_RANK: Record<string, number> = { masters: 4, master: 4, bachelor: 3, hsc: 2, ssc: 1 };
    const tutorIds = result.map(t => t.tutor_id);
    if (tutorIds.length > 0) {
      const { data: allEdu } = await supabase
        .from('tutor_education')
        .select('tutor_id, degree, institution')
        .in('tutor_id', tutorIds);
      const byTutor = new Map<string, { degree: string; rank: number }>();
      (allEdu || []).forEach((e: any) => {
        if (!e.institution?.trim()) return;
        const key = (e.degree || '').toLowerCase().trim();
        const rank = DEGREE_RANK[key] ?? 0;
        const cur = byTutor.get(e.tutor_id);
        if (!cur || rank > cur.rank) byTutor.set(e.tutor_id, { degree: e.degree, rank });
      });
      result = result.map(t => ({ ...t, last_education: byTutor.get(t.tutor_id)?.degree || null }));
    }

    // Last education filter
    if (filterLastEducation !== 'all') {
      result = result.filter(t => (t.last_education || '').toLowerCase() === filterLastEducation.toLowerCase());
    }

    setTutors(result);
    setTotalCount(result.length);
    setLoading(false);
  }, [search, filterAreas, filterGender, filterMedium, filterEducation, filterUniversity, filterVerification, filterAvailability, filterClassLevel, filterSubject, filterCategory, filterLastEducation, areas, districts, districtMap, areaMap, subjects]);

  useEffect(() => { fetchTutors(); }, [fetchTutors]);

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) setSelectedIds(new Set());
    else setSelectedIds(new Set(tutors.map(t => t.user_id)));
    setSelectAll(!selectAll);
  };

  // ─── Quick Actions ───
  const handleBanToggle = async (userId: string, currentlyBanned: boolean, reason?: string) => {
    const { error } = await supabase.from('profiles').update({
      is_banned: !currentlyBanned,
      banned_at: !currentlyBanned ? new Date().toISOString() : null,
      banned_reason: !currentlyBanned ? (reason || 'Banned by admin') : null,
    }).eq('id', userId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: currentlyBanned ? 'User Unbanned' : 'User Banned' });
    fetchTutors();
  };

  const openBanDialog = (userId: string, name: string) => {
    setBanTargetUserId(userId);
    setBanTargetName(name);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const confirmBan = async () => {
    if (!banTargetUserId || !banReason.trim()) {
      toast({ title: 'Ban reason is required', variant: 'destructive' });
      return;
    }
    setBanProcessing(true);
    await handleBanToggle(banTargetUserId, false, banReason.trim());
    setBanProcessing(false);
    setBanDialogOpen(false);
    setBanTargetUserId(null);
    setBanReason('');
  };

  const handleApproveToggle = async (userId: string, currentlyApproved: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_approved: !currentlyApproved }).eq('id', userId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: currentlyApproved ? 'Approval Revoked' : 'User Approved' });
    fetchTutors();
  };

  const handleVerifyToggle = async (tutorId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    const { error } = await supabase.from('tutor_profiles').update({
      verification_status: newStatus as any,
      verified_at: newStatus === 'approved' ? new Date().toISOString() : null,
    }).eq('id', tutorId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: newStatus === 'approved' ? 'Tutor Verified' : 'Verification Revoked' });
    fetchTutors();
  };

  // ─── Send Notification ───
  const handleSendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      toast({ title: 'Missing fields', description: 'Title and message are required', variant: 'destructive' });
      return;
    }
    setNotifySending(true);
    try {
      const targetUserIds = notifyMode === 'selected' ? Array.from(selectedIds) : tutors.map(t => t.user_id);
      if (targetUserIds.length === 0) {
        toast({ title: 'No tutors selected', description: 'Please select tutors or apply filters first', variant: 'destructive' });
        setNotifySending(false);
        return;
      }

      // Build message with job references if selected
      let finalMessage = notifyMessage.trim();
      if (notifySelectedJobs.length > 0) {
        const jobRefs = availableJobs.filter(j => notifySelectedJobs.includes(j.id)).map(j => `${j.job_reference || ''} - ${j.title}`).join('\n');
        finalMessage += '\n\nRelated Jobs:\n' + jobRefs;
      }

      const batchSize = 500;
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize).map(uid => ({
          user_id: uid,
          title: notifyTitle.trim(),
          message: finalMessage,
          type: 'admin_notification',
          reference_id: notifySelectedJobs.length === 1 ? notifySelectedJobs[0] : null,
        }));
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) throw error;
      }
      toast({ title: 'Notification Sent!', description: `Sent to ${targetUserIds.length} tutor(s)` });
      setNotifyDialogOpen(false);
      setNotifyTitle('');
      setNotifyMessage('');
      setNotifySelectedJobs([]);
      setNotifyJobCategory('all');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setNotifySending(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterAreas([]);
    setFilterGender('all');
    setFilterMedium('all');
    setFilterEducation('');
    setFilterUniversity('');
    setFilterVerification('all');
    setFilterAvailability('all');
    setFilterClassLevel('all');
    setFilterSubject('all');
    setFilterCategory('all');
    setFilterLastEducation('all');
  };

  const activeFilterCount = [
    filterAreas.length > 0, filterGender !== 'all', filterMedium !== 'all',
    filterEducation !== '', filterUniversity !== '',
    filterVerification !== 'all', filterAvailability !== 'all',
    filterClassLevel !== 'all', filterSubject !== 'all', filterCategory !== 'all',
    filterLastEducation !== 'all',
  ].filter(Boolean).length;

  const statusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Job options for notification multi-select
  const notifyJobOptions = useMemo(() =>
    availableJobs.map(j => ({ value: j.id, label: `${j.job_reference || '—'} · ${j.title}` })),
    [availableJobs]
  );

  // ─── CSV Export ───
  const handleExportCSV = () => {
    if (tutors.length === 0) { toast({ title: 'No data to export', variant: 'destructive' }); return; }
    const headers = ['Reference', 'Name', 'Email', 'Phone', 'Gender', 'District', 'Area/Thana', 'Education', 'Last Education', 'Experience (yrs)', 'Teaching Mode', 'Verification', 'Available', 'Rating', 'Class Levels', 'Approved', 'Banned', 'Joined'];
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const rows = tutors.map(t => [
      esc(t.user_reference || ''), esc(t.name), esc(t.email), esc(t.phone || ''),
      esc(t.gender), esc(t.district_name || ''), esc(t.area_name || ''),
      esc(t.education || ''), esc(t.last_education || ''), String(t.experience_years), esc(t.teaching_mode || ''),
      esc(t.verification_status), t.is_available ? 'Yes' : 'No',
      String(t.average_rating ?? ''), esc((t.class_levels || []).join(', ')),
      t.is_approved ? 'Yes' : 'No', t.is_banned ? 'Yes' : 'No',
      esc(t.created_at ? new Date(t.created_at).toLocaleDateString() : ''),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tutors_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'CSV Exported', description: `${tutors.length} tutors exported` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Tutor Profiles
          </h1>
          <p className="text-sm text-muted-foreground">{totalCount} tutors found</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={() => { setNotifyMode('selected'); setNotifyDialogOpen(true); }} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Notify Selected ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setNotifyMode('filtered'); setNotifyDialogOpen(true); }} className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notify All Filtered ({totalCount})
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, phone, or reference..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Filters
          {activeFilterCount > 0 && <span className="ml-1 text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs gap-1"><X className="h-3 w-3" /> Clear</Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-muted-foreground">City / Thana (multi)</Label>
                <MultiSearchableSelect
                  options={areaOptions}
                  values={filterAreas}
                  onValuesChange={setFilterAreas}
                  placeholder="Select areas..."
                  searchPlaceholder="Search thana..."
                  grouped
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Teaching Mode</Label>
                <Select value={filterMedium} onValueChange={setFilterMedium}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Verification</Label>
                <Select value={filterVerification} onValueChange={setFilterVerification}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Education / Degree</Label>
                <Input value={filterEducation} onChange={e => setFilterEducation(e.target.value)} className="mt-1 h-9" placeholder="e.g. BSc, MSc, HSC..." list="edu-options" />
                <datalist id="edu-options">{educationOptions.map(e => <option key={e} value={e} />)}</datalist>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">University / Institution</Label>
                <Input value={filterUniversity} onChange={e => setFilterUniversity(e.target.value)} className="mt-1 h-9" placeholder="e.g. Dhaka University..." list="uni-options" />
                <datalist id="uni-options">{universityOptions.map(u => <option key={u} value={u} />)}</datalist>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Availability</Label>
                <Select value={filterAvailability} onValueChange={setFilterAvailability}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Class Level</Label>
                <Select value={filterClassLevel} onValueChange={setFilterClassLevel}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {CLASS_LEVELS.map(group => (
                      <div key={group.group}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{group.group}</div>
                        {group.items.map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Subject Category</Label>
                <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); if (v !== filterCategory) setFilterSubject('all'); }}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {subjectCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {filteredSubjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Last Education</Label>
                <Select value={filterLastEducation} onValueChange={setFilterLastEducation}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="Masters">Masters</SelectItem>
                    <SelectItem value="Bachelor">Bachelor</SelectItem>
                    <SelectItem value="HSC">HSC</SelectItem>
                    <SelectItem value="SSC">SSC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tutor Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Last Education</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : tutors.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No tutors match the current filters</TableCell></TableRow>
                ) : tutors.map(t => (
                  <TableRow key={t.tutor_id} className={`${selectedIds.has(t.user_id) ? 'bg-primary/5' : ''} ${t.is_banned ? 'opacity-60' : ''}`}>
                    <TableCell><Checkbox checked={selectedIds.has(t.user_id)} onCheckedChange={() => toggleSelect(t.user_id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={t.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate flex items-center gap-1">
                            {t.name}
                            {t.is_banned && <Badge variant="destructive" className="text-[9px] py-0 px-1">Banned</Badge>}
                          </p>
                          {t.user_reference && <p className="text-[10px] font-mono text-muted-foreground">{t.user_reference}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="truncate max-w-[140px]">{t.email}</p>
                        {t.phone && <p className="text-muted-foreground">{t.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.area_name ? `${t.area_name}` : t.district_name || '—'}
                      {t.area_name && t.district_name && <span className="block text-[10px] text-muted-foreground">{t.district_name}</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{t.gender}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {t.last_education ? (
                        <Badge variant="secondary" className="text-[10px] font-semibold">{t.last_education}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{t.teaching_mode?.replace('_', ' ') || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge className={`text-[10px] capitalize ${statusColor(t.verification_status)}`}>{t.verification_status}</Badge>
                        {!t.is_approved && <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">Unapproved</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.average_rating ? `★ ${t.average_rating}` : '—'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenuRoot>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link to={`/tutor/${t.user_id}`} className="flex items-center gap-2">
                              <Eye className="h-3.5 w-3.5" /> View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/tutor/${t.user_id}`} className="flex items-center gap-2">
                              <Pencil className="h-3.5 w-3.5" /> Edit Profile
                            </Link>
                          </DropdownMenuItem>
                          {onImpersonate && (
                            <DropdownMenuItem onClick={() => onImpersonate(t.user_id)} className="flex items-center gap-2">
                              <LogIn className="h-3.5 w-3.5 text-primary" /> Login as Tutor
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleApproveToggle(t.user_id, t.is_approved)} className="flex items-center gap-2">
                            {t.is_approved
                              ? <><ShieldOff className="h-3.5 w-3.5 text-warning" /> Revoke Approval</>
                              : <><ShieldCheck className="h-3.5 w-3.5 text-success" /> Approve User</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVerifyToggle(t.tutor_id, t.verification_status)} className="flex items-center gap-2">
                            {t.verification_status === 'approved'
                              ? <><X className="h-3.5 w-3.5 text-warning" /> Revoke Verification</>
                              : <><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Verify Tutor</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => t.is_banned ? handleBanToggle(t.user_id, true) : openBanDialog(t.user_id, t.name)}
                            className={`flex items-center gap-2 ${!t.is_banned ? 'text-destructive focus:text-destructive' : ''}`}
                          >
                            {t.is_banned
                              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Unban User</>
                              : <><Ban className="h-3.5 w-3.5" /> Ban User</>
                            }
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuRoot>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              {notifyMode === 'selected'
                ? <p>Sending to <strong>{selectedIds.size}</strong> selected tutor(s)</p>
                : <p>Sending to <strong>{totalCount}</strong> tutors matching current filters</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="Notification title..." className="mt-1" maxLength={100} />
            </div>
            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} placeholder="Write your message..." className="mt-1" rows={3} maxLength={500} />
              <p className="text-xs text-muted-foreground mt-1">{notifyMessage.length}/500</p>
            </div>

            {/* Job Category filter */}
            <div>
              <Label className="text-sm font-medium">Attach Jobs (optional)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Select value={notifyJobCategory} onValueChange={v => { setNotifyJobCategory(v); setNotifySelectedJobs([]); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Job Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {JOB_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground flex items-center">
                  {jobsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {availableJobs.length} jobs available
                </div>
              </div>
            </div>

            {/* Multi-select jobs */}
            {availableJobs.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Select Jobs to Include</Label>
                <MultiSearchableSelect
                  options={notifyJobOptions}
                  values={notifySelectedJobs}
                  onValuesChange={setNotifySelectedJobs}
                  placeholder="Select jobs..."
                  searchPlaceholder="Search by reference or title..."
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={notifySending || !notifyTitle.trim() || !notifyMessage.trim()}>
              {notifySending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={(open) => { if (!open) { setBanDialogOpen(false); setBanTargetUserId(null); setBanReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" /> Ban User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to ban <strong>{banTargetName}</strong>? This user will no longer be able to access the platform.
            </p>
            <div>
              <Label className="text-sm font-medium">Ban Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter the reason for banning this user..."
                className="mt-1.5"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">{banReason.length}/500</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBanDialogOpen(false); setBanTargetUserId(null); setBanReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBan} disabled={banProcessing || !banReason.trim()}>
              {banProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
