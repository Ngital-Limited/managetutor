import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Search, GraduationCap, Send, Filter, Eye, Pencil, MapPin, Users,
  CheckCircle2, Loader2, Bell, X, LogIn
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface AreaRow { id: string; name_en: string; district_id: string; district_name?: string; }

export function AdminTutorProfilesTab({ toast, onImpersonate }: Props) {
  const { user: _user } = useAuth();

  // ─── Filters ───
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterMedium, setFilterMedium] = useState('all');
  const [filterEducation, setFilterEducation] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Data ───
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name_en: string }[]>([]);
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

  // ─── Education data for filter suggestions ───
  const [educationOptions, setEducationOptions] = useState<string[]>([]);
  const [universityOptions, setUniversityOptions] = useState<string[]>([]);

  useEffect(() => {
    // Fetch districts for area grouping
    supabase.from('districts').select('id, name_en').order('name_en').then(({ data }) => setDistricts(data || []));
    // Fetch areas (thanas/cities)
    supabase.from('areas').select('id, name_en, district_id').order('name_en').then(({ data }) => setAreas(data || []));
    // Fetch unique education values
    supabase.from('tutor_education').select('degree, institution').limit(500).then(({ data }) => {
      if (data) {
        const degrees = [...new Set(data.map(d => d.degree).filter(Boolean))].sort();
        const unis = [...new Set(data.map(d => d.institution).filter(Boolean))].sort();
        setEducationOptions(degrees);
        setUniversityOptions(unis);
      }
    });
  }, []);

  // Areas grouped by district for dropdown
  const districtMap = useMemo(() => new Map(districts.map(d => [d.id, d.name_en])), [districts]);
  const areasWithDistrict = useMemo(() =>
    areas.map(a => ({ ...a, district_name: districtMap.get(a.district_id) || '' })),
    [areas, districtMap]
  );
  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name_en])), [areas]);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    setSelectAll(false);

    // Build query
    let query = supabase
      .from('tutor_profiles')
      .select('id, user_id, gender, education, experience_years, teaching_mode, verification_status, is_available, average_rating, class_levels, district_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    // If area filter is set, find the district_id for that area and filter by it
    if (filterArea !== 'all') {
      const matchedArea = areas.find(a => a.id === filterArea);
      if (matchedArea) {
        query = query.eq('district_id', matchedArea.district_id);
      }
    }

    if (filterGender !== 'all') query = query.eq('gender', filterGender as any);
    if (filterDistrict !== 'all') query = query.eq('district_id', filterDistrict);
    if (filterVerification !== 'all') query = query.eq('verification_status', filterVerification as any);
    if (filterAvailability !== 'all') query = query.eq('is_available', filterAvailability === 'available');
    if (filterMedium !== 'all') query = query.eq('teaching_mode', filterMedium as any);

    const { data: tutorData, count } = await query;
    if (!tutorData) { setTutors([]); setLoading(false); return; }

    // Fetch profiles
    const userIds = [...new Set(tutorData.map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, user_reference, is_approved, is_banned')
      .in('id', userIds);
    const profMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // District map
    const distMap = new Map(districts.map(d => [d.id, d.name_en]));

    // If education/university filter set, fetch education data
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
        district_name: t.district_id ? distMap.get(t.district_id) || null : null,
        district_id: t.district_id,
        education: t.education,
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

    // Apply education/university filter client-side
    if (hasEduFilter) {
      result = result.filter(t => tutorIdsByEdu.has(t.tutor_id));
    }

    // Apply text search client-side
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.phone && t.phone.includes(q)) ||
        (t.user_reference && t.user_reference.toLowerCase().includes(q))
      );
    }

    setTutors(result);
    setTotalCount(result.length);
    setLoading(false);
  }, [search, filterDistrict, filterGender, filterMedium, filterEducation, filterUniversity, filterVerification, filterAvailability, districts]);

  useEffect(() => { fetchTutors(); }, [fetchTutors]);

  // ─── Selection helpers ───
  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tutors.map(t => t.user_id)));
    }
    setSelectAll(!selectAll);
  };

  // ─── Send Notification ───
  const handleSendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      toast({ title: 'Missing fields', description: 'Title and message are required', variant: 'destructive' });
      return;
    }

    setNotifySending(true);
    try {
      let targetUserIds: string[] = [];

      if (notifyMode === 'selected') {
        targetUserIds = Array.from(selectedIds);
      } else {
        // Send to all filtered tutors
        targetUserIds = tutors.map(t => t.user_id);
      }

      if (targetUserIds.length === 0) {
        toast({ title: 'No tutors selected', description: 'Please select tutors or apply filters first', variant: 'destructive' });
        setNotifySending(false);
        return;
      }

      // Insert notifications in batches
      const batchSize = 500;
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize).map(uid => ({
          user_id: uid,
          title: notifyTitle.trim(),
          message: notifyMessage.trim(),
          type: 'admin_notification',
        }));
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) throw error;
      }

      toast({ title: 'Notification Sent!', description: `Sent to ${targetUserIds.length} tutor(s)` });
      setNotifyDialogOpen(false);
      setNotifyTitle('');
      setNotifyMessage('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setNotifySending(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterDistrict('all');
    setFilterGender('all');
    setFilterMedium('all');
    setFilterEducation('');
    setFilterUniversity('');
    setFilterVerification('all');
    setFilterAvailability('all');
  };

  const activeFilterCount = [
    filterDistrict !== 'all',
    filterGender !== 'all',
    filterMedium !== 'all',
    filterEducation !== '',
    filterUniversity !== '',
    filterVerification !== 'all',
    filterAvailability !== 'all',
  ].filter(Boolean).length;

  const statusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
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
            <Button
              size="sm"
              onClick={() => { setNotifyMode('selected'); setNotifyDialogOpen(true); }}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> Notify Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNotifyMode('filtered'); setNotifyDialogOpen(true); }}
            className="gap-1.5"
          >
            <Bell className="h-3.5 w-3.5" /> Notify All Filtered ({totalCount})
          </Button>
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, or reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">District</Label>
                <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {districts.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Input
                  value={filterEducation}
                  onChange={e => setFilterEducation(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="e.g. BSc, MSc, HSC..."
                  list="edu-options"
                />
                <datalist id="edu-options">
                  {educationOptions.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">University / Institution</Label>
                <Input
                  value={filterUniversity}
                  onChange={e => setFilterUniversity(e.target.value)}
                  className="mt-1 h-9"
                  placeholder="e.g. Dhaka University..."
                  list="uni-options"
                />
                <datalist id="uni-options">
                  {universityOptions.map(u => <option key={u} value={u} />)}
                </datalist>
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead>Exp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell></TableRow>
                ) : tutors.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    No tutors match the current filters
                  </TableCell></TableRow>
                ) : tutors.map(t => (
                  <TableRow key={t.tutor_id} className={selectedIds.has(t.user_id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(t.user_id)}
                        onCheckedChange={() => toggleSelect(t.user_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={t.avatar_url || ''} />
                          <AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{t.name}</p>
                          {t.user_reference && (
                            <p className="text-[10px] font-mono text-muted-foreground">{t.user_reference}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="truncate max-w-[140px]">{t.email}</p>
                        {t.phone && <p className="text-muted-foreground">{t.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.district_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{t.gender}</Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{t.teaching_mode?.replace('_', ' ') || '—'}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{t.education || '—'}</TableCell>
                    <TableCell className="text-xs">{t.experience_years} yrs</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] capitalize ${statusColor(t.verification_status)}`}>
                        {t.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.average_rating ? `★ ${t.average_rating}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-0.5 justify-end">
                        <Button variant="ghost" size="sm" asChild title="View Public Profile">
                          <Link to={`/tutor/${t.user_id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Edit Profile">
                          <Link to={`/admin/tutor/${t.user_id}`}><Pencil className="h-3.5 w-3.5" /></Link>
                        </Button>
                        {onImpersonate && (
                          <Button variant="ghost" size="sm" onClick={() => onImpersonate(t.user_id)} title="Login as this tutor">
                            <LogIn className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                      </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              {notifyMode === 'selected' ? (
                <p>Sending to <strong>{selectedIds.size}</strong> selected tutor(s)</p>
              ) : (
                <p>Sending to <strong>{totalCount}</strong> tutors matching current filters</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={notifyTitle}
                onChange={e => setNotifyTitle(e.target.value)}
                placeholder="Notification title..."
                className="mt-1"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={notifyMessage}
                onChange={e => setNotifyMessage(e.target.value)}
                placeholder="Write your message..."
                className="mt-1"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">{notifyMessage.length}/500</p>
            </div>
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
    </div>
  );
}
