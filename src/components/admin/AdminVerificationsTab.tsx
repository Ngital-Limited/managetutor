import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  GraduationCap, Search, Filter, Eye, Pencil, CheckCircle2, XCircle,
  FileText, FileCheck, X, CreditCard, Download, Loader2, Clock,
  AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink
} from 'lucide-react';

interface Props {
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

interface VerificationDoc {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
}

interface TutorVerification {
  id: string;
  user_id: string;
  verification_status: string;
  verification_notes: string | null;
  education: string | null;
  experience_years: number;
  gender: string;
  created_at: string;
  district_id: string | null;
  area_id: string | null;
  district_name: string | null;
  area_name: string | null;
  user_reference: string | null;
  profiles: { full_name: string; email: string; phone: string | null };
  verification_documents: VerificationDoc[];
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  transaction_id: string;
  created_at: string;
  completed_at: string | null;
  listing_type: string | null;
  user_id: string;
  profiles: { full_name: string; email: string };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'document_needed', label: 'Document Needed' },
] as const;

const statusColor = (s: string) => {
  switch (s) {
    case 'open': case 'active': case 'approved': case 'completed': return 'bg-success/10 text-success border-success/20';
    case 'pending': case 'pending_approval': return 'bg-warning/10 text-warning border-warning/20';
    case 'under_review': return 'bg-primary/10 text-primary border-primary/20';
    case 'document_needed': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'rejected': case 'cancelled': case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'pending': return 'Pending';
    case 'under_review': return 'Under Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'document_needed': return 'Document Needed';
    default: return s;
  }
};

export function AdminVerificationsTab({ toast }: Props) {
  // ─── Filters ───
  const [statusFilter, setStatusFilter] = useState('pending');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // ─── Data ───
  const [tutors, setTutors] = useState<TutorVerification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [districts, setDistricts] = useState<{ id: string; name_en: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name_en: string }[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const verificationFee = 50;

  // ─── Pagination ───
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [vPaymentsPage, setVPaymentsPage] = useState(1);
  const [vPaymentsPageSize, setVPaymentsPageSize] = useState(10);

  // ─── Selection ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Dialogs ───
  const [selectedTutor, setSelectedTutor] = useState<TutorVerification | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VerificationDoc | null>(null);
  const [bulkActionDialog, setBulkActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Load districts/areas once
  useEffect(() => {
    supabase.from('districts').select('id, name_en').order('name_en').then(({ data }) => setDistricts(data || []));
    supabase.from('areas').select('id, name_en').order('name_en').then(({ data }) => setAreas(data || []));
  }, []);

  // Reset page on filter change
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [statusFilter, docTypeFilter, districtFilter, areaFilter, searchText, pageSize]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('tutor_profiles')
      .select(
        'id, user_id, verification_status, verification_notes, education, experience_years, gender, created_at, district_id, area_id, verification_documents (id, document_type, document_url, status)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (statusFilter !== 'all') {
      query = query.eq('verification_status', statusFilter as any);
    }

    const { data, count } = await query;
    if (data) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const [{ data: profilesData }, { data: districtsData }, { data: areasData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, user_reference').in('id', userIds),
        supabase.from('districts').select('id, name_en'),
        supabase.from('areas').select('id, name_en'),
      ]);
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const districtMap = new Map((districtsData || []).map(d => [d.id, d.name_en]));
      const areaMap = new Map((areasData || []).map(a => [a.id, a.name_en]));

      setTutors(data.map((t: any) => {
        const prof = profileMap.get(t.user_id) || { full_name: 'Unknown', email: '', phone: null, user_reference: null };
        return {
          ...t,
          district_name: t.district_id ? districtMap.get(t.district_id) ?? null : null,
          area_name: t.area_id ? areaMap.get(t.area_id) ?? null : null,
          user_reference: prof.user_reference ?? null,
          profiles: { full_name: prof.full_name, email: prof.email, phone: prof.phone },
        };
      }) as TutorVerification[]);
      setTotalCount(count || 0);
    }

    // Fetch verification badge payments
    const { data: vPayments } = await supabase
      .from('payment_transactions')
      .select('id, amount, currency, status, transaction_id, created_at, completed_at, listing_type, user_id')
      .eq('listing_type', 'verification_badge')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (vPayments) {
      const uids = [...new Set(vPayments.map(p => p.user_id))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', uids);
      const pMap = new Map(profs?.map(p => [p.id, p]) || []);
      setPayments(vPayments.map(p => ({ ...p, profiles: pMap.get(p.user_id) || { full_name: 'Unknown', email: '' } })) as unknown as PaymentRow[]);
    }

    setLoading(false);
  }, [page, pageSize, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Client-side filters ───
  const filteredTutors = useMemo(() => {
    const searchLower = searchText.toLowerCase().trim();
    return tutors.filter(t => {
      if (docTypeFilter !== 'all' && !t.verification_documents?.some(d => d.document_type === docTypeFilter)) return false;
      if (districtFilter !== 'all' && t.district_id !== districtFilter) return false;
      if (areaFilter !== 'all' && t.area_id !== areaFilter) return false;
      if (searchLower) {
        const ref = (t.user_reference || '').toLowerCase();
        const name = (t.profiles?.full_name || '').toLowerCase();
        const phone = (t.profiles?.phone || '').toLowerCase();
        const email = (t.profiles?.email || '').toLowerCase();
        if (!ref.includes(searchLower) && !name.includes(searchLower) && !phone.includes(searchLower) && !email.includes(searchLower)) return false;
      }
      return true;
    });
  }, [tutors, docTypeFilter, districtFilter, areaFilter, searchText]);

  const docTypeOptions = useMemo(() =>
    Array.from(new Set(tutors.flatMap(t => (t.verification_documents || []).map(d => d.document_type).filter(Boolean)))).sort(),
    [tutors]
  );

  // ─── Selection helpers ───
  const allSelected = filteredTutors.length > 0 && filteredTutors.every(t => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredTutors.map(t => t.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // ─── Single verify ───
  const handleVerifyTutor = async (tutorId: string, status: string, notes?: string) => {
    setProcessing(true);
    const updateData: any = {
      verification_status: status,
      verification_notes: notes?.trim() || null,
    };
    if (status === 'approved') updateData.verified_at = new Date().toISOString();
    else if (status === 'pending') updateData.verified_at = null;

    const { error } = await supabase.from('tutor_profiles').update(updateData).eq('id', tutorId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else {
      toast({ title: 'Success', description: `Tutor ${statusLabel(status).toLowerCase()}` });

      // Send email notification
      try {
        const tutor = tutors.find(v => v.id === tutorId);
        if (tutor?.user_id) {
          const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', tutor.user_id).single();
          if (profile?.email) {
            await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'tutor-approval-status',
                recipientEmail: profile.email,
                idempotencyKey: `tutor-verify-${tutorId}-${status}`,
                templateData: { tutorName: profile.full_name, status },
              },
            });
          }
        }
      } catch (e) { console.error('Email send failed:', e); }

      setSelectedTutor(null);
      fetchData();
    }
    setProcessing(false);
  };

  // ─── Bulk actions ───
  const handleBulkAction = async () => {
    if (!bulkActionDialog || selectedIds.size === 0) return;
    setBulkProcessing(true);
    const status = bulkActionDialog === 'approve' ? 'approved' : 'rejected';
    const updateData: any = {
      verification_status: status,
      verification_notes: bulkNotes.trim() || null,
    };
    if (status === 'approved') updateData.verified_at = new Date().toISOString();

    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('tutor_profiles').update(updateData).in('id', ids);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else {
      toast({ title: 'Success', description: `${ids.length} tutor(s) ${status}` });
      setSelectedIds(new Set());
      fetchData();
    }
    setBulkProcessing(false);
    setBulkActionDialog(null);
    setBulkNotes('');
  };

  // ─── Bulk download ───
  const handleBulkDownload = () => {
    const selectedTutors = filteredTutors.filter(t => selectedIds.has(t.id));
    const docs = selectedTutors.flatMap(t =>
      (t.verification_documents || []).map(d => ({ ...d, tutorName: t.profiles?.full_name }))
    );
    if (docs.length === 0) { sonnerToast.error('No documents to download'); return; }
    docs.forEach((doc, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = doc.document_url;
        a.download = `${doc.tutorName}_${doc.document_type}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }, i * 300);
    });
    sonnerToast.success(`Downloading ${docs.length} document(s)`);
  };

  // ─── Filter chip counts ───
  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (docTypeFilter !== 'all' ? 1 : 0) +
    (districtFilter !== 'all' ? 1 : 0) +
    (areaFilter !== 'all' ? 1 : 0) +
    (searchText ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setDocTypeFilter('all');
    setDistrictFilter('all');
    setAreaFilter('all');
    setSearchText('');
  };

  // ─── Detect if URL is image ───
  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
  const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

  // ─── Pagination ───
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">
          Tutor Verifications
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({totalCount} total{filteredTutors.length !== tutors.length ? `, ${filteredTutors.length} shown` : ''})
          </span>
        </h1>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear filters ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by Ref ID, Name, Phone, Email"
          className="pl-8 h-9"
        />
      </div>

      {/* Filter bar */}
      <div className="admin-filters">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Document type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All document types</SelectItem>
            {docTypeOptions.map(dt => (
              <SelectItem key={dt} value={dt} className="capitalize">{dt.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={districtFilter} onValueChange={setDistrictFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="City / District" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {districts.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {areas.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => { setBulkNotes(''); setBulkActionDialog('approve'); }}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Bulk Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setBulkNotes(''); setBulkActionDialog('reject'); }}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Bulk Reject
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> Download Docs
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Card><CardContent className="py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
      ) : filteredTutors.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
          <h3 className="font-bold mb-2">No tutors found</h3>
          <p className="text-muted-foreground">No tutors match the selected filters</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Ref ID</TableHead>
                    <TableHead>Tutor Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Email ID</TableHead>
                    <TableHead>Uploaded Documents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTutors.map((tutor) => (
                    <TableRow key={tutor.id} className={selectedIds.has(tutor.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(tutor.id)}
                          onCheckedChange={() => toggleOne(tutor.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tutor.user_reference || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-tutor/10 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-tutor" />
                          </div>
                          <span className="font-medium text-sm">{tutor.profiles?.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{tutor.profiles?.phone || '—'}</TableCell>
                      <TableCell className="text-sm">{tutor.profiles?.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tutor.verification_documents?.length > 0 ? (
                            tutor.verification_documents.map((doc) => (
                              <Badge
                                key={doc.id}
                                variant="outline"
                                className="text-xs capitalize cursor-pointer hover:bg-primary/10 transition-colors"
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <FileCheck className="h-3 w-3 mr-1" />
                                {doc.document_type?.replace(/_/g, ' ') || 'Document'}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No documents</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColor(tutor.verification_status)}`}>
                          {statusLabel(tutor.verification_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" asChild title="Edit Profile">
                            <Link to={`/admin/tutor/${tutor.user_id}`}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTutor(tutor)} title="Review">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {tutor.verification_status !== 'approved' && (
                            <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => handleVerifyTutor(tutor.id, 'approved')} disabled={processing} title="Approve">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {tutor.verification_status !== 'rejected' && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleVerifyTutor(tutor.id, 'rejected')} disabled={processing} title="Reject">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)}>« First</Button>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last »</Button>
          </div>
        </div>
      )}

      {/* Verification Badge Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Verification Badge Payments
          </CardTitle>
          <CardDescription>Payment history for ৳{verificationFee} verified badge purchases</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No verification payments yet</TableCell></TableRow>
                ) : payments.slice((vPaymentsPage - 1) * vPaymentsPageSize, vPaymentsPage * vPaymentsPageSize).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.transaction_id}</TableCell>
                    <TableCell className="text-sm">{(p.profiles as any)?.full_name}</TableCell>
                    <TableCell className="text-sm font-semibold">৳{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className={`text-xs capitalize ${statusColor(p.status)}`}>{p.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      {payments.length > 0 && (() => {
        const tPages = Math.max(1, Math.ceil(payments.length / vPaymentsPageSize));
        const pg = Math.min(vPaymentsPage, tPages);
        const start = (pg - 1) * vPaymentsPageSize + 1;
        const end = Math.min(pg * vPaymentsPageSize, payments.length);
        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <div className="text-xs text-muted-foreground">Showing {start}–{end} of {payments.length}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(vPaymentsPageSize)} onValueChange={(v) => { setVPaymentsPageSize(Number(v)); setVPaymentsPage(1); }}>
                <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={pg <= 1} onClick={() => setVPaymentsPage(1)}>« First</Button>
              <Button variant="outline" size="sm" disabled={pg <= 1} onClick={() => setVPaymentsPage(pg - 1)}>Prev</Button>
              <span className="text-xs text-muted-foreground">Page {pg} of {tPages}</span>
              <Button variant="outline" size="sm" disabled={pg >= tPages} onClick={() => setVPaymentsPage(pg + 1)}>Next</Button>
              <Button variant="outline" size="sm" disabled={pg >= tPages} onClick={() => setVPaymentsPage(tPages)}>Last »</Button>
            </div>
          </div>
        );
      })()}

      {/* ═══ Review Tutor Dialog ═══ */}
      <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Tutor Verification</DialogTitle></DialogHeader>
          {selectedTutor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">Name</label><p className="font-semibold">{selectedTutor.profiles?.full_name}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Email</label><p className="text-sm">{selectedTutor.profiles?.email}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Gender</label><p className="capitalize">{selectedTutor.gender}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Experience</label><p>{selectedTutor.experience_years} years</p></div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground">Education</label><p>{selectedTutor.education || 'Not provided'}</p></div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Current Status</label>
                  <Badge className={`ml-2 text-xs ${statusColor(selectedTutor.verification_status)}`}>{statusLabel(selectedTutor.verification_status)}</Badge>
                  {selectedTutor.verification_notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">Notes: {selectedTutor.verification_notes}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Uploaded Documents</label>
                {selectedTutor.verification_documents?.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedTutor.verification_documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="w-full flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm capitalize">{doc.document_type?.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="ml-auto text-xs capitalize">{doc.status}</Badge>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground mt-1">No documents uploaded</p>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {selectedTutor?.verification_status !== 'under_review' && (
              <Button variant="outline" onClick={() => handleVerifyTutor(selectedTutor!.id, 'under_review')} disabled={processing}>
                <Clock className="h-4 w-4 mr-1" /> Under Review
              </Button>
            )}
            {selectedTutor?.verification_status !== 'document_needed' && (
              <Button variant="outline" className="text-orange-600" onClick={() => handleVerifyTutor(selectedTutor!.id, 'document_needed')} disabled={processing}>
                <FileText className="h-4 w-4 mr-1" /> Request Docs
              </Button>
            )}
            <Button variant="destructive" onClick={() => handleVerifyTutor(selectedTutor!.id, 'rejected')} disabled={processing}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button className="bg-success hover:bg-success/90" onClick={() => handleVerifyTutor(selectedTutor!.id, 'approved')} disabled={processing}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Document Preview Modal ═══ */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              <FileText className="h-5 w-5 text-primary" />
              {previewDoc?.document_type?.replace(/_/g, ' ') || 'Document'} Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-muted/30">
            {previewDoc && (
              isImageUrl(previewDoc.document_url) ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={previewDoc.document_url}
                    alt={previewDoc.document_type}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                </div>
              ) : isPdfUrl(previewDoc.document_url) ? (
                <iframe
                  src={previewDoc.document_url}
                  className="w-full h-[65vh] rounded-lg"
                  title="Document Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                </div>
              )
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
            <Button asChild>
              <a href={previewDoc?.document_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Open in New Tab
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <a href={previewDoc?.document_url} download>
                <Download className="h-4 w-4 mr-1" /> Download
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Bulk Action Confirmation Dialog ═══ */}
      <Dialog open={!!bulkActionDialog} onOpenChange={(open) => { if (!open) setBulkActionDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkActionDialog === 'approve'
                ? <><CheckCircle2 className="h-5 w-5 text-success" /> Bulk Approve</>
                : <><XCircle className="h-5 w-5 text-destructive" /> Bulk Reject</>
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {bulkActionDialog === 'approve' ? 'Approve' : 'Reject'} <strong>{selectedIds.size}</strong> selected tutor(s)?
            </p>
            <div>
              <Label className="text-xs font-medium">Notes (optional)</Label>
              <Textarea
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                placeholder={bulkActionDialog === 'reject' ? 'Reason for rejection...' : 'Add notes...'}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>Cancel</Button>
            <Button
              onClick={handleBulkAction}
              disabled={bulkProcessing}
              className={bulkActionDialog === 'approve' ? 'bg-success hover:bg-success/90' : ''}
              variant={bulkActionDialog === 'reject' ? 'destructive' : 'default'}
            >
              {bulkProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Confirm {bulkActionDialog === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
