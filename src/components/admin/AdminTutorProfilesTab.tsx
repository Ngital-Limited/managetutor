import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Search, GraduationCap, Send, Filter, Eye, Pencil,
  Loader2, Bell, X, LogIn, Ban, CheckCircle2, ShieldOff, ShieldCheck, Download, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, Clock, FileText, AlertCircle
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
  last_institution: string | null;
  education_history: Array<{
    degree: string | null;
    institution: string | null;
    field_of_study: string | null;
    passing_year: number | null;
    result: string | null;
    medium: string | null;
    is_current: boolean | null;
  }>;
  experience_years: number;
  teaching_mode: string | null;
  verification_status: string;
  is_available: boolean;
  // average_rating removed
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
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [filterEduMedium, setFilterEduMedium] = useState('all');
  const [filterEduBackground, setFilterEduBackground] = useState('all');
  const [filterFieldOfStudy, setFilterFieldOfStudy] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'last_education' | 'joined' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchDebounced, setSearchDebounced] = useState('');

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
  const [universityOptions, setUniversityOptions] = useState<string[]>([]);
  const [eduMediumOptions, setEduMediumOptions] = useState<string[]>([]);
  const [fieldOfStudyOptions, setFieldOfStudyOptions] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('districts').select('id, name_en').order('name_en').then(({ data }) => setDistricts(data || []));
    supabase.from('areas').select('id, name_en, district_id').order('name_en').then(({ data }) => setAreas(data || []));
    supabase.from('tutor_education').select('degree, institution, medium, field_of_study').limit(2000).then(({ data }) => {
      if (data) {
        setUniversityOptions([...new Set(data.map(d => d.institution).filter(Boolean))].sort());
        setEduMediumOptions([...new Set(data.map(d => d.medium).filter(Boolean))].sort());
        // Field of study only from Bachelor/Masters records
        const higherEdu = data.filter(d => ['Bachelor', 'Bachelors', 'Masters'].includes(d.degree || ''));
        const fields = [...new Set(higherEdu.map(d => (d.field_of_study || '').trim()).filter(f => f && f.length > 2 && !f.startsWith('.')))].sort();
        setFieldOfStudyOptions(fields);
      }
    });
  }, []);

  const districtMap = useMemo(() => new Map(districts.map(d => [d.id, d.name_en])), [districts]);
  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name_en])), [areas]);

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

  // Debounce search to avoid hammering the server on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchDebounced, filterAreas, filterGender,
    filterUniversity, filterVerification, filterAvailability,
    filterEduMedium, filterEduBackground, filterFieldOfStudy,
    sortBy, sortDir, pageSize,
  ]);

  const queryTutors = useCallback(async (opts: {
    from: number;
    to: number;
    fetchAllIds?: boolean;
  }) => {
    // ─── Pre-resolve cross-table ID filters ───
    const idConstraints: string[][] = [];

    // Education-based filters → tutor_education
    const hasEduFilter = filterUniversity || filterEduMedium !== 'all' || filterEduBackground !== 'all' || filterFieldOfStudy !== 'all';
    if (hasEduFilter) {
      let eduQ = supabase.from('tutor_education').select('tutor_id');
      if (filterUniversity) eduQ = eduQ.ilike('institution', `%${filterUniversity}%`);
      if (filterEduMedium !== 'all') eduQ = eduQ.eq('medium', filterEduMedium);
      if (filterEduBackground !== 'all') {
        // SSC or HSC degree filter
        eduQ = eduQ.eq('degree', filterEduBackground);
      }
      if (filterFieldOfStudy !== 'all') {
        // Field of study from Bachelor/Masters records
        eduQ = eduQ.in('degree', ['Bachelor', 'Bachelors', 'Masters']).ilike('field_of_study', `%${filterFieldOfStudy}%`);
      }
      const { data } = await eduQ;
      idConstraints.push([...new Set((data || []).map(r => r.tutor_id))]);
    }

    // Search by name/email/phone/reference → resolve via profiles
    let searchUserIds: string[] | null = null;
    if (searchDebounced) {
      const esc = searchDebounced.replace(/[%,()]/g, ' ');
      const { data: pData } = await supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%,user_reference.ilike.%${esc}%`)
        .limit(2000);
      searchUserIds = [...new Set((pData || []).map(p => p.id))];
      if (searchUserIds.length === 0) return { rows: [], count: 0, ids: [] as string[] };
    }

    // If any cross-table filter returned 0 ids, short-circuit
    if (idConstraints.some(arr => arr.length === 0)) {
      return { rows: [], count: 0, ids: [] as string[] };
    }

    // Intersect cross-table id constraints
    let intersectedIds: string[] | null = null;
    if (idConstraints.length > 0) {
      intersectedIds = idConstraints.reduce<string[]>((acc, cur, i) => {
        if (i === 0) return cur;
        const set = new Set(cur);
        return acc.filter(id => set.has(id));
      }, []);
      if (intersectedIds.length === 0) return { rows: [], count: 0, ids: [] as string[] };
    }

    // ─── Main query ───
    const buildBase = (selectCols: string, withCount: boolean) => {
      let q = supabase
        .from('tutor_profiles')
        .select(selectCols, withCount ? { count: 'exact' } : undefined);

      if (filterGender !== 'all') q = q.eq('gender', filterGender as any);
      if (filterVerification !== 'all') q = q.eq('verification_status', filterVerification as any);
      if (filterAvailability !== 'all') q = q.eq('is_available', filterAvailability === 'available');

      // Multi-area: narrow by district_id (then refine on area_id client-side per page)
      if (filterAreas.length > 0) {
        const districtIds = [...new Set(
          filterAreas.map(aId => areas.find(a => a.id === aId)?.district_id).filter(Boolean)
        )] as string[];
        if (districtIds.length > 0) q = q.in('district_id', districtIds);
      }

      if (intersectedIds) q = q.in('id', intersectedIds);
      return q;
    };

    if (opts.fetchAllIds) {
      const all: { user_id: string; id: string }[] = [];
      const PAGE = 1000;
      for (let from = 0; from < 50000; from += PAGE) {
        const { data } = await buildBase('id, user_id', false)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data as any);
        if (data.length < PAGE) break;
      }
      let filtered = all;
      if (searchUserIds) {
        const set = new Set(searchUserIds);
        filtered = all.filter(r => set.has(r.user_id));
      }
      return { rows: [], count: filtered.length, ids: filtered.map(r => r.user_id) };
    }

    let pageQ = buildBase(
      'id, user_id, gender, education, experience_years, teaching_mode, verification_status, is_available, class_levels, district_id, created_at, slug',
      true,
    );
    if (searchUserIds) pageQ = pageQ.in('user_id', searchUserIds);

    pageQ = pageQ.order('created_at', { ascending: sortBy === 'joined' ? sortDir === 'asc' : false })
                 .range(opts.from, opts.to);

    const { data: tutorData, count } = await pageQ;
    return { rows: tutorData || [], count: count ?? 0, ids: [] as string[] };
  }, [
    searchDebounced, filterAreas, filterGender,
    filterUniversity, filterVerification, filterAvailability,
    filterEduMedium, filterEduBackground, filterFieldOfStudy,
    areas, sortBy, sortDir,
  ]);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setSelectAll(false);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { rows: tutorData, count } = await queryTutors({ from, to });

    if (tutorData.length === 0) {
      setTutors([]);
      setTotalCount(count);
      setLoading(false);
      return;
    }

    // Hydrate this page only (small fixed batch)
    const userIds = [...new Set(tutorData.map((t: any) => t.user_id))];
    const tutorIds = tutorData.map((t: any) => t.id);

    const [{ data: profilesData }, { data: eduData }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, email, phone, avatar_url, user_reference, is_approved, is_banned, area_id')
        .in('id', userIds),
      supabase.from('tutor_education')
        .select('tutor_id, degree, institution, field_of_study, passing_year, result, medium, is_current')
        .in('tutor_id', tutorIds)
        .order('passing_year', { ascending: false, nullsFirst: false }),
    ]);

    const profMap = new Map((profilesData || []).map(p => [p.id, p]));
    const DEGREE_RANK: Record<string, number> = { masters: 4, master: 4, bachelor: 3, hsc: 2, ssc: 1 };
    const lastEduMap = new Map<string, string>();
    const lastInstMap = new Map<string, string>();
    const eduHistMap = new Map<string, TutorRow['education_history']>();
    (eduData || []).forEach((e: any) => {
      const list = eduHistMap.get(e.tutor_id) || [];
      list.push({
        degree: e.degree,
        institution: e.institution,
        field_of_study: e.field_of_study,
        passing_year: e.passing_year,
        result: e.result,
        medium: e.medium,
        is_current: e.is_current,
      });
      eduHistMap.set(e.tutor_id, list);

      if (!e.institution?.trim()) return;
      const key = (e.degree || '').toLowerCase().trim();
      const rank = DEGREE_RANK[key] ?? 0;
      const cur = lastEduMap.get(e.tutor_id);
      const curRank = cur ? (DEGREE_RANK[cur.toLowerCase()] ?? 0) : -1;
      if (rank > curRank) {
        lastEduMap.set(e.tutor_id, e.degree);
        lastInstMap.set(e.tutor_id, e.institution);
      }
    });

    let result: TutorRow[] = tutorData.map((t: any) => {
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
        last_education: lastEduMap.get(t.id) || null,
        last_institution: lastInstMap.get(t.id) || null,
        education_history: eduHistMap.get(t.id) || [],
        experience_years: t.experience_years || 0,
        teaching_mode: t.teaching_mode,
        verification_status: t.verification_status || 'pending',
        is_available: t.is_available ?? true,
        class_levels: t.class_levels,
        user_reference: prof?.user_reference || null,
        created_at: t.created_at || '',
        is_approved: prof?.is_approved ?? false,
        is_banned: prof?.is_banned ?? false,
        ...(t.slug ? { slug: t.slug } : {}),
      } as TutorRow;
    });

    // Client-side narrow by exact area (district pre-filter is server-side)
    if (filterAreas.length > 0) {
      result = result.filter(t => t.area_id && filterAreas.includes(t.area_id));
    }

    setTutors(result);
    setTotalCount(count);
    setLoading(false);
  }, [queryTutors, currentPage, pageSize, districtMap, areaMap, filterAreas]);

  useEffect(() => { fetchTutors(); }, [fetchTutors]);

  // Sort current page client-side for last_education only (joined sort is server-side)
  const sortedTutors = useMemo(() => {
    if (sortBy !== 'last_education') return tutors;
    const DEGREE_RANK: Record<string, number> = { masters: 4, master: 4, bachelor: 3, hsc: 2, ssc: 1 };
    const arr = [...tutors];
    arr.sort((a, b) => {
      const av = DEGREE_RANK[(a.last_education || '').toLowerCase()] ?? 0;
      const bv = DEGREE_RANK[(b.last_education || '').toLowerCase()] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [tutors, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedTutors = sortedTutors; // already a single page from the server

  // Clamp page if it overflows after data change
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
    if (error) { sonnerToast.error('Error', { description: error.message }); return; }
    sonnerToast.success(currentlyBanned ? 'User Unbanned' : 'User Banned');
    await fetchTutors();
  };

  const openBanDialog = (userId: string, name: string) => {
    setBanTargetUserId(userId);
    setBanTargetName(name);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const confirmBan = async () => {
    if (!banTargetUserId || !banReason.trim()) {
      sonnerToast.error('Ban reason is required');
      return;
    }
    setBanProcessing(true);
    await handleBanToggle(banTargetUserId, false, banReason.trim());
    setBanProcessing(false);
    setBanDialogOpen(false);
    setBanTargetUserId(null);
    setBanReason('');
  };

  // ─── Role Transfer ───
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTargetUserId, setTransferTargetUserId] = useState<string | null>(null);
  const [transferTargetName, setTransferTargetName] = useState('');
  const [transferProcessing, setTransferProcessing] = useState(false);

  const openTransferDialog = (userId: string, name: string) => {
    setTransferTargetUserId(userId);
    setTransferTargetName(name);
    setTransferDialogOpen(true);
  };

  const confirmTransferToParent = async () => {
    if (!transferTargetUserId) return;
    setTransferProcessing(true);
    try {
      const { error } = await supabase.rpc('transfer_user_role', {
        _target_user_id: transferTargetUserId,
        _new_role: 'parent',
      });
      if (error) {
        sonnerToast.error('Transfer Failed', { description: error.message });
      } else {
        sonnerToast.success('Role Transferred', { description: `${transferTargetName} has been converted to a Parent.` });
        await fetchTutors();
      }
    } catch (err: any) {
      sonnerToast.error('Transfer Failed', { description: err?.message || 'An unexpected error occurred.' });
    } finally {
      setTransferProcessing(false);
      setTransferDialogOpen(false);
      setTransferTargetUserId(null);
    }
  };

  const handleApproveToggle = async (userId: string, currentlyApproved: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_approved: !currentlyApproved }).eq('id', userId);
    if (error) { sonnerToast.error('Error', { description: error.message }); return; }
    sonnerToast.success(currentlyApproved ? 'Approval Revoked' : 'User Approved');
    await fetchTutors();
  };

  const handleVerifyToggle = async (tutorId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    const { error } = await supabase.from('tutor_profiles').update({
      verification_status: newStatus as any,
      verified_at: newStatus === 'approved' ? new Date().toISOString() : null,
    }).eq('id', tutorId);
    if (error) { sonnerToast.error('Error', { description: error.message }); return; }
    sonnerToast.success(newStatus === 'approved' ? 'Tutor Verified' : 'Verification Revoked');
    await fetchTutors();
  };

  // ─── Send Notification ───
  const handleSendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      sonnerToast.error('Missing fields', { description: 'Title and message are required' });
      return;
    }
    setNotifySending(true);
    try {
      const targetUserIds = notifyMode === 'selected'
        ? Array.from(selectedIds)
        : (await queryTutors({ from: 0, to: 0, fetchAllIds: true })).ids;
      if (targetUserIds.length === 0) {
        sonnerToast.error('No tutors selected', { description: 'Please select tutors or apply filters first' });
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
      sonnerToast.success('Notification Sent!', { description: `Sent to ${targetUserIds.length} tutor(s)` });
      setNotifyDialogOpen(false);
      setNotifyTitle('');
      setNotifyMessage('');
      setNotifySelectedJobs([]);
      setNotifyJobCategory('all');
    } catch (err: any) {
      sonnerToast.error('Error', { description: err.message });
    } finally {
      setNotifySending(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterAreas([]);
    setFilterGender('all');
    setFilterUniversity('');
    setFilterVerification('all');
    setFilterAvailability('all');
    setFilterEduMedium('all');
    setFilterEduBackground('all');
    setFilterFieldOfStudy('all');
  };

  const activeFilterCount = [
    filterAreas.length > 0, filterGender !== 'all',
    filterUniversity !== '',
    filterVerification !== 'all', filterAvailability !== 'all',
    filterEduMedium !== 'all', filterEduBackground !== 'all',
    filterFieldOfStudy !== 'all',
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
    if (tutors.length === 0) { sonnerToast.error('No data to export'); return; }
    const headers = ['Reference', 'Name', 'Email', 'Phone', 'Gender', 'District', 'Area/Thana', 'Education', 'Last Education', 'Experience (yrs)', 'Teaching Mode', 'Verification', 'Available', 'Class Levels', 'Approved', 'Banned', 'Joined'];
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const rows = tutors.map(t => [
      esc(t.user_reference || ''), esc(t.name), esc(t.email), esc(t.phone || ''),
      esc(t.gender), esc(t.district_name || ''), esc(t.area_name || ''),
      esc(t.education || ''), esc(t.last_education || ''), String(t.experience_years), esc(t.teaching_mode || ''),
      esc(t.verification_status), t.is_available ? 'Yes' : 'No',
      esc((t.class_levels || []).join(', ')),
      t.is_approved ? 'Yes' : 'No', t.is_banned ? 'Yes' : 'No',
      esc(t.created_at ? new Date(t.created_at).toLocaleDateString() : ''),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tutors_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    sonnerToast.success('CSV Exported', { description: `${tutors.length} tutors exported` });
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
                <Label className="text-xs font-medium text-muted-foreground">Education Medium</Label>
                <Select value={filterEduMedium} onValueChange={setFilterEduMedium}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Bangla Medium">Bangla Medium</SelectItem>
                    <SelectItem value="English Medium">English Medium</SelectItem>
                    <SelectItem value="English Version">English Version</SelectItem>
                    <SelectItem value="Madrasa">Madrasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Education Background</Label>
                <Select value={filterEduBackground} onValueChange={setFilterEduBackground}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="SSC">SSC</SelectItem>
                    <SelectItem value="HSC">HSC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Field of Study</Label>
                <Select value={filterFieldOfStudy} onValueChange={setFilterFieldOfStudy}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {fieldOfStudyOptions.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
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
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => {
                        if (sortBy === 'last_education') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('last_education'); setSortDir('desc'); }
                      }}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Last Education
                      {sortBy === 'last_education'
                        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  </TableHead>
                  <TableHead>Last Education Institution</TableHead>
                  <TableHead>Education Background</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => {
                        if (sortBy === 'joined') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortBy('joined'); setSortDir('desc'); }
                      }}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Joined
                      {sortBy === 'joined'
                        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : sortedTutors.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">No tutors match the current filters</TableCell></TableRow>
                ) : paginatedTutors.map(t => (
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
                    <TableCell className="text-xs max-w-[200px] truncate" title={t.last_institution || ''}>{t.last_institution || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {t.education_history.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:text-primary"
                              aria-label="View full education background"
                            >
                              <GraduationCap className="h-3.5 w-3.5" />
                              <span className="font-medium">{t.education_history.length}</span>
                              <span className="text-muted-foreground">
                                {t.education_history.length === 1 ? 'entry' : 'entries'}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-80 p-0">
                            <div className="px-3 py-2 border-b bg-muted/40">
                              <p className="text-xs font-semibold">Education Background</p>
                              <p className="text-[10px] text-muted-foreground truncate">{t.name}</p>
                            </div>
                            <ScrollArea className="max-h-72">
                              <ul className="divide-y">
                                {t.education_history.map((e, idx) => (
                                  <li key={idx} className="px-3 py-2 text-xs space-y-0.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold capitalize">{e.degree || 'Unknown degree'}</span>
                                      <div className="flex items-center gap-1">
                                        {e.is_current && <Badge variant="secondary" className="text-[9px] py-0 px-1">Current</Badge>}
                                        {e.passing_year && <span className="text-muted-foreground text-[10px]">{e.passing_year}</span>}
                                      </div>
                                    </div>
                                    {e.institution && (
                                      <p className="text-foreground/90 truncate" title={e.institution}>{e.institution}</p>
                                    )}
                                    {(e.field_of_study || e.medium) && (
                                      <p className="text-muted-foreground text-[10px]">
                                        {[e.field_of_study, e.medium].filter(Boolean).join(' • ')}
                                      </p>
                                    )}
                                    {e.result && (
                                      <p className="text-muted-foreground text-[10px]">Result: {e.result}</p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge className={`text-[10px] capitalize ${statusColor(t.verification_status)}`}>{t.verification_status}</Badge>
                        {!t.is_approved && <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">Unapproved</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      <DropdownMenuRoot>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link to={`/tutor/${(t as any).slug || t.user_id}`} className="flex items-center gap-2">
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
                          <DropdownMenuItem onClick={() => openTransferDialog(t.user_id, t.name)} className="flex items-center gap-2">
                            <ArrowUpDown className="h-3.5 w-3.5 text-primary" /> Transfer to Parent
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
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</Button>
                <span className="text-sm font-medium px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>Last</Button>
              </div>
            </div>
          )}
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

      {/* Transfer Role Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={(open) => { if (!open) { setTransferDialogOpen(false); setTransferTargetUserId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-primary" /> Transfer Role
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Transfer <strong>{transferTargetName}</strong> from <strong>Tutor</strong> to <strong>Parent</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              Their tutor profile will be marked unavailable but kept for reference. They will be able to post jobs as a parent.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setTransferDialogOpen(false); setTransferTargetUserId(null); }}>
              Cancel
            </Button>
            <Button onClick={confirmTransferToParent} disabled={transferProcessing}>
              {transferProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowUpDown className="h-4 w-4 mr-1" />}
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
