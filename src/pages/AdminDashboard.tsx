import { useState, useEffect, useCallback } from 'react';
import { formatExactDate } from '@/lib/date';
import { Logo } from '@/components/Logo';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { NotificationBell } from '@/components/NotificationBell';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Download } from 'lucide-react';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  GraduationCap, Shield, Users, Briefcase, CheckCircle2, XCircle,
  Clock, AlertTriangle, BarChart3, FileText, Settings, Search,
  Eye, Ban, UserCheck, FileCheck,
  LogOut, Home, DollarSign, Trash2, CreditCard, Megaphone, Send, Mail,
  Package, Plus, Pencil, ToggleLeft, ToggleRight, Wallet, MapPin, LifeBuoy, ShieldCheck,
  LogIn, BookOpen, UserPlus, TrendingUp, ChevronLeft, ArrowLeft,
  Phone, Calendar, X
} from 'lucide-react';
import { RevenuePayoutTab } from '@/components/admin/RevenuePayoutTab';
import { SupportTicketsTab } from '@/components/admin/SupportTicketsTab';
import { GeographicHeatmapTab } from '@/components/admin/GeographicHeatmapTab';
import { SubAdminRBACTab } from '@/components/admin/SubAdminRBACTab';
import { PlatformDataTab } from '@/components/admin/PlatformDataTab';
import { AdminCreateUserTab } from '@/components/admin/AdminCreateUserTab';
import { AdminPostJobTab } from '@/components/admin/AdminPostJobTab';
import { AdminTutorEditTab } from '@/components/admin/AdminTutorEditTab';
import { AdminTutorProfilesTab } from '@/components/admin/AdminTutorProfilesTab';
import { ReferralAnalyticsTab } from '@/components/admin/ReferralAnalyticsTab';
import { getPlatformCommissionPct, computeFeeSplit } from '@/lib/commission';

// ──────────── Types ────────────
interface Stats {
  totalUsers: number;
  totalTutors: number;
  totalParents: number;
  pendingVerifications: number;
  activeJobs: number;
  totalJobs: number;
  completedJobs: number;
  acceptedJobs: number;
  pendingReports: number;
  totalRevenue: number;
  pendingJobs: number;
  pendingUsers: number;
  pendingApplications: number;
}

interface JobApplication {
  id: string;
  tutor_id: string;
  status: string;
  proposed_rate: number | null;
  cover_message: string | null;
  created_at: string;
  tutor_name: string;
  tutor_email: string;
  tutor_gender: string;
  tutor_experience: number;
  tutor_verification: string;
  tutor_user_id: string;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_approved: boolean;
  created_at: string;
  role?: string;
  user_reference?: string | null;
  district_id?: string | null;
  area_id?: string | null;
  district_name?: string | null;
  area_name?: string | null;
  jobs_count?: number;
}

interface TutorVerification {
  id: string;
  user_id: string;
  verification_status: string;
  education: string | null;
  experience_years: number;
  gender: string;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string | null };
  verification_documents: { id: string; document_type: string; document_url: string; status: string }[];
}

interface JobRow {
  id: string;
  title: string;
  job_reference: string | null;
  status: string;
  teaching_mode: string;
  total_applications: number;
  created_at: string;
  districts: { name_en: string };
  subjects: { name_en: string } | null;
  profiles: { full_name: string };
}

interface Report {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string;
  reporter: { full_name: string };
  reported: { full_name: string; email: string };
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
  profiles: { full_name: string; email: string };
}

// ──────────── Broadcast Tab ────────────
function BroadcastTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [target, setTarget] = useState<'all' | 'tutors' | 'parents'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ title: string; target: string; date: string }[]>([]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Missing fields', description: 'Title and message are required', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      // Determine which roles to target
      const roles: ("parent" | "tutor")[] = target === 'all' ? ['parent', 'tutor'] : target === 'tutors' ? ['tutor'] : ['parent'];
      const { data: roleRows } = await supabase.from('user_roles').select('user_id').in('role', roles);
      if (!roleRows || roleRows.length === 0) {
        toast({ title: 'No users found', description: 'No users match the selected audience', variant: 'destructive' });
        setSending(false);
        return;
      }

      // Deduplicate user IDs
      const userIds = [...new Set(roleRows.map(r => r.user_id))];

      // Insert notifications in batches of 500
      const batchSize = 500;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize).map(uid => ({
          user_id: uid,
          title: title.trim(),
          message: message.trim(),
          type: 'broadcast',
        }));
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) throw error;
      }

      toast({ title: 'Broadcast sent!', description: `Notification sent to ${userIds.length} user(s)` });
      setSent(prev => [{ title: title.trim(), target, date: new Date().toISOString() }, ...prev]);
      setTitle('');
      setMessage('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Broadcast Notifications</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Send Broadcast</CardTitle>
            <CardDescription>Send a notification to all tutors, parents, or everyone at once.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Audience</label>
              <Select value={target} onValueChange={(v) => setTarget(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users (Tutors & Parents)</SelectItem>
                  <SelectItem value="tutors">Tutors Only</SelectItem>
                  <SelectItem value="parents">Parents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Platform Maintenance Notice" className="mt-1" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your broadcast message..." className="mt-1" rows={4} maxLength={500} />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/500 characters</p>
            </div>
            <Button className="w-full" onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
              {sending ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Broadcasts</CardTitle>
            <CardDescription>Broadcasts sent during this session</CardDescription>
          </CardHeader>
          <CardContent>
            {sent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No broadcasts sent yet</p>
            ) : (
              <div className="space-y-3">
                {sent.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Megaphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{s.target === 'all' ? 'Everyone' : s.target}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(s.date), 'HH:mm')}</span>
                      </div>
                    </div>
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

// ──────────── Subscription Plans Tab ────────────
interface PlanForm {
  name: string; description: string;
  price_monthly: number; price_quarterly: number; price_yearly: number;
  max_applications_per_month: number; featured_profile: boolean; priority_support: boolean;
  is_active: boolean;
}
const emptyPlan: PlanForm = {
  name: '', description: '',
  price_monthly: 0, price_quarterly: 0, price_yearly: 0,
  max_applications_per_month: 10, featured_profile: false, priority_support: false,
  is_active: true,
};

function ContactMessagesTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const markAsRead = async (id: string) => {
    await supabase.from('contact_messages').update({ is_read: true }).eq('id', id);
    fetchMessages();
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('contact_messages').delete().eq('id', id);
    toast({ title: 'Message deleted' });
    setSelectedMsg(null);
    fetchMessages();
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Contact Messages</h1>
        {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : messages.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No contact messages yet</TableCell></TableRow>
              ) : messages.map((msg) => (
                <TableRow key={msg.id} className={!msg.is_read ? 'bg-primary/5 font-medium' : ''}>
                  <TableCell>
                    <Badge variant={msg.is_read ? 'secondary' : 'default'} className="text-xs">
                      {msg.is_read ? 'Read' : 'New'}
                    </Badge>
                  </TableCell>
                  <TableCell>{msg.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{msg.email}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{msg.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatExactDate(new Date(msg.created_at))}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedMsg(msg); if (!msg.is_read) markAsRead(msg.id); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMsg?.subject}</DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{selectedMsg.name}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${selectedMsg.email}`} className="text-primary hover:underline">{selectedMsg.email}</a></div>
                {selectedMsg.phone && <div><span className="text-muted-foreground">Phone:</span> {selectedMsg.phone}</div>}
                <div><span className="text-muted-foreground">Date:</span> {format(new Date(selectedMsg.created_at), 'PPp')}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{selectedMsg.message}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMsg(null)}>Close</Button>
            <Button variant="destructive" onClick={() => deleteMessage(selectedMsg?.id)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────── Demo Requests Tab ────────────
function DemoRequestsTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('demo_bookings')
      .select('*, subjects(name_en), tutor_id, parent_id')
      .order('created_at', { ascending: false });
    if (data) {
      const parentIds = [...new Set(data.map(d => d.parent_id))];
      const tutorIds = [...new Set(data.map(d => d.tutor_id))];
      const [{ data: parentProfs }, { data: tutorData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone').in('id', parentIds),
        supabase.from('tutor_profiles').select('id, user_id, display_name').in('id', tutorIds),
      ]);
      const parentMap = new Map(parentProfs?.map(p => [p.id, p]) || []);
      const tutorUserIds = [...new Set(tutorData?.map(t => t.user_id) || [])];
      const { data: tutorProfs } = await supabase.from('profiles').select('id, full_name').in('id', tutorUserIds);
      const tutorProfMap = new Map(tutorProfs?.map(p => [p.id, p]) || []);
      const tutorMap = new Map(tutorData?.map(t => [t.id, { ...t, profiles: tutorProfMap.get(t.user_id) || { full_name: t.display_name || 'Unknown' } }]) || []);
      
      setRequests(data.map(d => ({
        ...d,
        profiles: parentMap.get(d.parent_id) || { full_name: 'Unknown', email: '', phone: null },
        tutor_profiles: tutorMap.get(d.tutor_id) || { id: d.tutor_id, display_name: 'Unknown', profiles: { full_name: 'Unknown' } },
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('demo_bookings')
      .update({ status })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Updated', description: `Demo request ${status}.` });

    const request = requests.find(r => r.id === id);
    if (request) {
      if (status === 'approved') {
        // Format the schedule for the notification message
        const scheduleStr = `${request.preferred_date} at ${request.preferred_time}${request.duration_minutes ? ` (${request.duration_minutes} min)` : ''}`;

        // Sync the linked application status to 'invited_to_demo' if present
        if (request.application_id) {
          await supabase.from('applications').update({ status: 'invited_to_demo' as any }).eq('id', request.application_id);
        }

        const { data: tp } = await supabase
          .from('tutor_profiles')
          .select('user_id')
          .eq('id', request.tutor_profiles?.id)
          .single();
        if (tp) {
          await supabase.from('notifications').insert({
            user_id: tp.user_id,
            title: 'Demo Class Scheduled',
            message: `A guardian has invited you to a demo class on ${scheduleStr}. Approved by admin.${request.notes ? ' Notes: ' + request.notes : ''}`,
            type: 'demo_approved',
            reference_id: id,
          });
        }
        await supabase.from('notifications').insert({
          user_id: request.parent_id,
          title: 'Demo Class Approved',
          message: `Your demo class invitation for ${scheduleStr} has been approved! The tutor has been notified.`,
          type: 'demo_approved',
          reference_id: id,
        });
      } else if (status === 'rejected') {
        await supabase.from('notifications').insert({
          user_id: request.parent_id,
          title: 'Demo Class Request Declined',
          message: 'Your demo class request was not approved. Please try another tutor.',
          type: 'demo_rejected',
          reference_id: id,
        });
      }
    }
    fetchRequests();
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'pending': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Confirmed</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Demo Class Requests</h1>
        {pendingCount > 0 && (
          <Badge className="bg-warning text-warning-foreground">{pendingCount} pending</Badge>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No demo class requests yet</TableCell></TableRow>
                ) : requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{r.profiles?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                        {r.parent_phone && <p className="text-xs text-muted-foreground">{r.parent_phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{r.tutor_profiles?.profiles?.full_name || r.tutor_profiles?.display_name || 'N/A'}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.subjects?.name_en || '—'}</TableCell>
                    <TableCell>
                      <p className="text-sm">{r.preferred_date}</p>
                      <p className="text-xs text-muted-foreground">{r.preferred_time} · {r.duration_minutes}min</p>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-success">Free</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      {r.status === 'pending' ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={() => updateStatus(r.id, 'approved')}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'rejected')}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : null}
                      {r.notes && <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={r.notes}>Note: {r.notes}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionPlansTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>({ ...emptyPlan });
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('subscription_plans').select('*').order('price_monthly');
    setPlans(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyPlan }); setDialogOpen(true); };
  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name || '', description: plan.description || '',
      price_monthly: plan.price_monthly || 0, price_quarterly: plan.price_quarterly || 0, price_yearly: plan.price_yearly || 0,
      max_applications_per_month: plan.max_applications_per_month || 0,
      featured_profile: plan.featured_profile || false, priority_support: plan.priority_support || false,
      is_active: plan.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('subscription_plans').update({
          name: form.name, description: form.description || null,
          price_monthly: form.price_monthly, price_quarterly: form.price_quarterly || null, price_yearly: form.price_yearly || null,
          max_applications_per_month: form.max_applications_per_month || null,
          featured_profile: form.featured_profile, priority_support: form.priority_support, is_active: form.is_active,
        }).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Plan updated' });
      } else {
        const { error } = await supabase.from('subscription_plans').insert({
          name: form.name, description: form.description || null,
          price_monthly: form.price_monthly, price_quarterly: form.price_quarterly || null, price_yearly: form.price_yearly || null,
          max_applications_per_month: form.max_applications_per_month || null,
          featured_profile: form.featured_profile, priority_support: form.priority_support, is_active: form.is_active,
        });
        if (error) throw error;
        toast({ title: 'Plan created' });
      }
      setDialogOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('subscription_plans').update({ is_active: !current }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Plan ${!current ? 'activated' : 'deactivated'}` }); fetchPlans(); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Plan deleted' }); fetchPlans(); }
  };

  const set = (key: keyof PlanForm, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Subscription Plans</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Create Plan</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Clock className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : plans.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No subscription plans yet. Create your first plan.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {plan.description && <CardDescription className="mt-1">{plan.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">৳{plan.price_monthly}</p>
                    <p className="text-[10px] text-muted-foreground">Monthly</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">৳{plan.price_quarterly || '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Quarterly</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold">৳{plan.price_yearly || '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Yearly</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Applications/month</span><span className="font-medium">{plan.max_applications_per_month ?? 'Unlimited'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Featured Profile</span><span>{plan.featured_profile ? '✓' : '✗'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Priority Support</span><span>{plan.priority_support ? '✓' : '✗'}</span></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(plan.id, plan.is_active)}>
                    {plan.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deletePlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Plan' : 'Create Plan'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">Plan Name *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Plan description..." className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Monthly (৳) *</label>
                <Input type="number" value={form.price_monthly} onChange={e => set('price_monthly', Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Quarterly (৳)</label>
                <Input type="number" value={form.price_quarterly} onChange={e => set('price_quarterly', Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Yearly (৳)</label>
                <Input type="number" value={form.price_yearly} onChange={e => set('price_yearly', Number(e.target.value))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Max Applications / Month</label>
              <Input type="number" value={form.max_applications_per_month} onChange={e => set('max_applications_per_month', Number(e.target.value))} className="mt-1" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured_profile} onChange={e => set('featured_profile', e.target.checked)} className="rounded" />
                Featured Profile
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.priority_support} onChange={e => set('priority_support', e.target.checked)} className="rounded" />
                Priority Support
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────── Component ────────────
export default function AdminDashboard() {
  const { user, role, loading, impersonateUser, impersonation, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalTutors: 0, totalParents: 0,
    pendingVerifications: 0, activeJobs: 0, totalJobs: 0, completedJobs: 0, acceptedJobs: 0,
    pendingReports: 0, totalRevenue: 0, pendingJobs: 0, pendingUsers: 0,
    pendingApplications: 0,
  });

  // Data states
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  // Guardians/Parents filters
  const [guardianDistrictFilter, setGuardianDistrictFilter] = useState<string>('all');
  const [guardianAreaFilter, setGuardianAreaFilter] = useState<string[]>([]);
  const [guardianStatusFilter, setGuardianStatusFilter] = useState<string>('all');
  const [guardianPage, setGuardianPage] = useState(1);
  const [guardianPageSize, setGuardianPageSize] = useState(25);
  const [guardianDistricts, setGuardianDistricts] = useState<{ id: string; name_en: string }[]>([]);
  const [guardianAreas, setGuardianAreas] = useState<{ id: string; name_en: string; district_id: string }[]>([]);
  const [viewingParentJobs, setViewingParentJobs] = useState<{ id: string; name: string } | null>(null);
  const [parentJobs, setParentJobs] = useState<any[]>([]);
  const [loadingParentJobs, setLoadingParentJobs] = useState(false);
  const [pendingTutors, setPendingTutors] = useState<TutorVerification[]>([]);
  const [verificationFilter, setVerificationFilter] = useState('pending');
  const [verificationPayments, setVerificationPayments] = useState<PaymentRow[]>([]);
  const [verificationFee, setVerificationFee] = useState<number>(50);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(25);
  // Applications tab pagination (Level 1: jobs grouping, Level 2: applicants list)
  const [appsJobsPage, setAppsJobsPage] = useState(1);
  const [appsJobsPageSize, setAppsJobsPageSize] = useState(25);
  const [appsApplicantsPage, setAppsApplicantsPage] = useState(1);
  const [appsApplicantsPageSize, setAppsApplicantsPageSize] = useState(25);
  // Payments tab pagination
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(25);
  // Verification badge payments pagination
  const [vPaymentsPage, setVPaymentsPage] = useState(1);
  const [vPaymentsPageSize, setVPaymentsPageSize] = useState(25);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsSearch, setReportsSearch] = useState('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [chartData, setChartData] = useState<{ signups: any[]; jobs: any[]; revenue: any[] }>({ signups: [], jobs: [], revenue: [] });

  // Dialog states
  const [selectedTutor, setSelectedTutor] = useState<TutorVerification | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editJobForm, setEditJobForm] = useState({
    title: '', description: '', status: '', teaching_mode: '',
    budget_min: 0, budget_max: 0, district_id: '', area_id: '',
    class_level: '', subject_id: '', days_per_week: 0, duration_hours: 0,
    preferred_time: '', fixed_time: '', preferred_tutor_gender: 'any', student_gender: '',
    student_age: '', number_of_students: 1, location_details: '',
    special_requirements: '', start_date: '',
  });
  const [editJobDistricts, setEditJobDistricts] = useState<{ id: string; name_en: string }[]>([]);
  const [editJobAreas, setEditJobAreas] = useState<{ id: string; name_en: string; district_id: string }[]>([]);
  const [editJobSubjects, setEditJobSubjects] = useState<{ id: string; name_en: string }[]>([]);

  // Application viewer state
  const [viewingJobApps, setViewingJobApps] = useState<{ jobId: string; jobTitle: string } | null>(null);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [assignTutorSearch, setAssignTutorSearch] = useState('');
  const [assignTutorResults, setAssignTutorResults] = useState<{ tutor_id: string; user_id: string; name: string; gender: string; experience: number; phone: string | null; email: string; district: string | null; rating: number | null; verification: string | null; reference: string | null }[]>([]);
  const [searchingTutors, setSearchingTutors] = useState(false);

  // All-applications (admin Applications tab)
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [allAppsStatusFilter, setAllAppsStatusFilter] = useState('all');
  const [allAppsSearch, setAllAppsSearch] = useState('');
  const [appsView, setAppsView] = useState<'jobs' | 'applicants'>('jobs');
  const [selectedAppsJobId, setSelectedAppsJobId] = useState<string | null>(null);
  const [appsJobsSearch, setAppsJobsSearch] = useState('');
  const [loadingAllApps, setLoadingAllApps] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Admin direct demo schedule dialog
  const [demoScheduleApp, setDemoScheduleApp] = useState<{ appId: string; jobId: string; jobTitle: string; tutorUserId: string; tutorProfileId: string; tutorName: string } | null>(null);
  const [demoScheduleDate, setDemoScheduleDate] = useState('');
  const [demoScheduleTime, setDemoScheduleTime] = useState('');
  const [demoScheduleDuration, setDemoScheduleDuration] = useState('60');
  const [demoScheduleNotes, setDemoScheduleNotes] = useState('');
  const [demoScheduleFee, setDemoScheduleFee] = useState('0');
  const [demoScheduleCommissionPct, setDemoScheduleCommissionPct] = useState(20);
  const [demoScheduling, setDemoScheduling] = useState(false);

  const openDemoSchedule = (app: { id: string; tutor_user_id: string; tutor_id: string; tutor_name: string }, jobId: string, jobTitle: string) => {
    setDemoScheduleApp({
      appId: app.id,
      jobId,
      jobTitle,
      tutorUserId: app.tutor_user_id,
      tutorProfileId: app.tutor_id,
      tutorName: app.tutor_name,
    });
    setDemoScheduleDate('');
    setDemoScheduleTime('');
    setDemoScheduleDuration('60');
    setDemoScheduleNotes('');
    setDemoScheduleFee('0');
    getPlatformCommissionPct().then(setDemoScheduleCommissionPct);
  };

  const handleAdminScheduleDemo = async () => {
    if (!demoScheduleApp || !demoScheduleDate || !demoScheduleTime) {
      toast({ title: 'Missing info', description: 'Please pick a date and time', variant: 'destructive' });
      return;
    }
    setDemoScheduling(true);
    try {
      const { data: jobRow } = await supabase.from('jobs').select('parent_id, subject_id').eq('id', demoScheduleApp.jobId).maybeSingle();
      if (!jobRow?.parent_id) throw new Error('Job parent not found');

      // Admin-direct: status starts as 'approved' (no further admin approval gate needed)
      const split = computeFeeSplit(Number(demoScheduleFee) || 0, demoScheduleCommissionPct);
      const { error: bookingError } = await supabase.from('demo_bookings').insert({
        parent_id: jobRow.parent_id,
        tutor_id: demoScheduleApp.tutorProfileId,
        application_id: demoScheduleApp.appId,
        subject_id: jobRow.subject_id || null,
        preferred_date: demoScheduleDate,
        preferred_time: demoScheduleTime,
        duration_minutes: parseInt(demoScheduleDuration),
        class_fee: split.classFee,
        platform_commission: split.platformCommission,
        tutor_payout: split.tutorPayout,
        notes: demoScheduleNotes || null,
        status: 'approved',
      } as any);
      if (bookingError) throw bookingError;

      // Sync application status
      await supabase.from('applications').update({ status: 'invited_to_demo' as any }).eq('id', demoScheduleApp.appId);

      const scheduleStr = `${demoScheduleDate} at ${demoScheduleTime} (${demoScheduleDuration} min)`;

      if (demoScheduleApp.tutorUserId) {
        await supabase.from('notifications').insert({
          user_id: demoScheduleApp.tutorUserId,
          title: 'Demo Class Scheduled by Admin',
          message: `You have been scheduled for a demo class for "${demoScheduleApp.jobTitle}" on ${scheduleStr}.${demoScheduleNotes ? ' Notes: ' + demoScheduleNotes : ''}`,
          type: 'application_invited_to_demo',
          reference_id: demoScheduleApp.jobId,
        });
      }
      await supabase.from('notifications').insert({
        user_id: jobRow.parent_id,
        title: 'Demo Class Scheduled',
        message: `Admin has scheduled a demo class with ${demoScheduleApp.tutorName} for "${demoScheduleApp.jobTitle}" on ${scheduleStr}.`,
        type: 'demo_approved',
        reference_id: demoScheduleApp.jobId,
      });

      toast({ title: 'Demo scheduled', description: `${scheduleStr}. Tutor notified.` });
      setDemoScheduleApp(null);
      fetchJobApplications(demoScheduleApp.jobId);
      fetchAllApplications();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDemoScheduling(false);
    }
  };

  const fetchAllApplications = useCallback(async () => {
    setLoadingAllApps(true);
    let query = supabase
      .from('applications')
      .select(`
        id, status, proposed_rate, cover_message, created_at, tutor_id, job_id,
        jobs!inner (
          id, title, job_reference, parent_id, status, description, class_level,
          budget_min, budget_max, teaching_mode, days_per_week, duration_hours,
          preferred_time, fixed_time, start_date, number_of_students, student_age,
          student_gender, preferred_tutor_gender, student_school_name,
          location_details, special_requirements, created_at,
          districts ( name_en ), areas ( name_en ),
          job_subjects ( subjects ( id, name_en ) )
        ),
        tutor_profiles!inner ( id, user_id, gender, experience_years, verification_status, bio, monthly_salary_min, monthly_salary_max )
      `)
      .order('created_at', { ascending: false })
      .limit(200);
    // Note: do NOT filter by status in the query — chips and drill-down need full counts.
    const { data } = await query;
    if (!data) { setAllApplications([]); setLoadingAllApps(false); return; }
    const tutorProfileIds = Array.from(new Set(data.map((a: any) => (a.tutor_profiles as any)?.id).filter(Boolean)));
    const tutorUserIds = Array.from(new Set(data.map((a: any) => (a.tutor_profiles as any)?.user_id).filter(Boolean)));
    const parentIds = Array.from(new Set(data.map((a: any) => (a.jobs as any)?.parent_id).filter(Boolean)));
    const allUserIds = Array.from(new Set([...tutorUserIds, ...parentIds]));
    let profs: any[] = [];
    if (allUserIds.length > 0) {
      const { data: profData } = await supabase.from('profiles').select('id, full_name, email, phone, avatar_url, user_reference').in('id', allUserIds as string[]);
      profs = profData || [];
    }
    const profMap = new Map(profs.map((p: any) => [p.id, p]));
    // Fetch latest education per tutor
    const eduMap = new Map<string, any>();
    if (tutorProfileIds.length > 0) {
      const { data: eduData } = await supabase
        .from('tutor_education')
        .select('tutor_id, degree, institution, field_of_study, passing_year')
        .in('tutor_id', tutorProfileIds as string[])
        .order('passing_year', { ascending: false });
      for (const e of eduData || []) {
        if (!eduMap.has(e.tutor_id)) eduMap.set(e.tutor_id, e);
      }
    }
    setAllApplications(data.map((a: any) => ({
      ...a,
      tutor_profile: profMap.get((a.tutor_profiles as any)?.user_id) || null,
      parent_profile: profMap.get((a.jobs as any)?.parent_id) || null,
      tutor_last_education: eduMap.get((a.tutor_profiles as any)?.id) || null,
    })));
    setLoadingAllApps(false);
  }, []);


  const fetchJobApplications = async (jobId: string) => {
    setLoadingApps(true);
    const { data } = await supabase
      .from('applications')
      .select('id, tutor_id, status, proposed_rate, cover_message, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    if (data && data.length > 0) {
      const tutorIds = [...new Set(data.map(a => a.tutor_id))];
      const { data: tutors } = await supabase.from('tutor_profiles').select('id, user_id, gender, experience_years, verification_status').in('id', tutorIds);
      const tutorUserIds = [...new Set(tutors?.map(t => t.user_id) || [])];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', tutorUserIds);
      const profMap = new Map(profs?.map(p => [p.id, p]) || []);
      const tutorMap = new Map(tutors?.map(t => [t.id, { ...t, profile: profMap.get(t.user_id) }]) || []);
      setJobApplications(data.map(a => {
        const t = tutorMap.get(a.tutor_id);
        return {
          ...a,
          tutor_name: t?.profile?.full_name || 'Unknown',
          tutor_email: t?.profile?.email || '',
          tutor_gender: t?.gender || '',
          tutor_experience: t?.experience_years || 0,
          tutor_verification: t?.verification_status || 'pending',
          tutor_user_id: t?.user_id || '',
        };
      }) as JobApplication[]);
    } else {
      setJobApplications([]);
    }
    setLoadingApps(false);
  };

  const handleAdminUpdateAppStatus = async (appId: string, status: string, jobId: string) => {
    setProcessing(true);
    const { error } = await supabase.from('applications').update({ status: status as any }).eq('id', appId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // If accepting, also update job status to in_progress
      if (status === 'accepted') {
        await supabase.from('jobs').update({ status: 'in_progress' as any }).eq('id', jobId);
      }
      // Notify the tutor for accept/reject
      const app = jobApplications.find(a => a.id === appId);
      if (app?.tutor_user_id && (status === 'accepted' || status === 'rejected' || status === 'shortlisted')) {
        const statusLabels: Record<string, string> = {
          accepted: 'Congratulations! You have been assigned',
          rejected: 'Your application was not selected',
          shortlisted: 'You have been shortlisted!',
        };
        await supabase.from('notifications').insert({
          user_id: app.tutor_user_id,
          title: statusLabels[status] || `Application ${status}`,
          message: `For the job: ${viewingJobApps?.jobTitle || ''}`,
          type: `application_${status}`,
          reference_id: jobId,
        });
      }
      toast({ title: `Application ${status}` });
      fetchJobApplications(jobId);
      fetchAllApplications();
      fetchJobs();
      fetchStats();
    }
    setProcessing(false);
  };

  const handleSearchTutors = async (query: string) => {
    setAssignTutorSearch(query);
    if (query.length < 2) { setAssignTutorResults([]); return; }
    setSearchingTutors(true);
    try {
      // Search profiles by name, email, phone, or user_reference
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email, phone, user_reference, district_id')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,user_reference.ilike.%${query}%`)
        .limit(20);
      if (profs && profs.length > 0) {
        const profIds = profs.map(p => p.id);
        const { data: tutors } = await supabase.from('tutor_profiles')
          .select('id, user_id, gender, experience_years, verification_status, district_id')
          .in('user_id', profIds);
        if (tutors && tutors.length > 0) {
          const profMap = new Map(profs.map(p => [p.id, p]));
          // Get district names
          const districtIds = [...new Set([...tutors.map(t => t.district_id), ...profs.map(p => p.district_id)].filter(Boolean))] as string[];
          let districtMap = new Map<string, string>();
          if (districtIds.length > 0) {
            const { data: dists } = await supabase.from('districts').select('id, name_en').in('id', districtIds);
            districtMap = new Map(dists?.map(d => [d.id, d.name_en]) || []);
          }
          setAssignTutorResults(tutors.map(t => {
            const prof = profMap.get(t.user_id);
            const distId = t.district_id || prof?.district_id;
            return {
              tutor_id: t.id,
              user_id: t.user_id,
              name: prof?.full_name || 'Unknown',
              gender: t.gender,
              experience: t.experience_years || 0,
              phone: prof?.phone || null,
              email: prof?.email || '',
              district: distId ? (districtMap.get(distId) || null) : null,
              rating: null,
              verification: t.verification_status,
              reference: prof?.user_reference || null,
            };
          }));
        } else {
          setAssignTutorResults([]);
        }
      } else {
        setAssignTutorResults([]);
      }
    } catch {
      setAssignTutorResults([]);
    }
    setSearchingTutors(false);
  };

  const handleAssignTutor = async (tutorId: string, tutorUserId: string, tutorName: string) => {
    if (!viewingJobApps) return;
    // Check if already applied
    const existing = jobApplications.find(a => a.tutor_id === tutorId);
    if (existing) {
      toast({ title: 'Already applied', description: `${tutorName} has already applied to this job`, variant: 'destructive' });
      return;
    }
    setProcessing(true);
    // Create an application with accepted status
    const { error } = await supabase.from('applications').insert({
      job_id: viewingJobApps.jobId,
      tutor_id: tutorId,
      status: 'accepted' as any,
      cover_message: 'Assigned by admin',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update job status to in_progress
      await supabase.from('jobs').update({ status: 'in_progress' as any }).eq('id', viewingJobApps.jobId);
      // Notify tutor
      await supabase.from('notifications').insert({
        user_id: tutorUserId,
        title: 'You have been assigned to a job!',
        message: `Admin has assigned you to: ${viewingJobApps.jobTitle}`,
        type: 'application_accepted',
        reference_id: viewingJobApps.jobId,
      });
      toast({ title: 'Tutor assigned successfully' });
      setAssignTutorSearch('');
      setAssignTutorResults([]);
      fetchJobApplications(viewingJobApps.jobId);
      fetchJobs();
      fetchStats();
    }
    setProcessing(false);
  };

  useEffect(() => {
    if (!loading) {
      if (!user) navigate('/auth');
      else if (role !== 'admin') {
        navigate('/dashboard');
        toast({ title: 'Access Denied', description: 'Admin access required', variant: 'destructive' });
      } else {
        fetchStats();
        fetchChartData();
      }
    }
  }, [user, role, loading]);

  const fetchStats = async () => {
    const [
      { count: totalUsers },
      { count: totalTutors },
      { count: totalParents },
      { count: pendingVerifications },
      { count: activeJobs },
      { count: totalJobs },
      { count: completedJobs },
      { count: acceptedJobs },
      { count: pendingReports },
      { count: pendingJobs },
      { count: pendingUsers },
      { count: pendingApplications },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('tutor_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
      supabase.from('tutor_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress' as any),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval' as any),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending' as any),
    ]);

    const { data: rev } = await supabase.from('payment_transactions').select('amount').eq('status', 'completed');
    const totalRevenue = rev?.reduce((s, r) => s + Number(r.amount), 0) || 0;

    setStats({
      totalUsers: totalUsers || 0, totalTutors: totalTutors || 0, totalParents: totalParents || 0,
      pendingVerifications: pendingVerifications || 0, activeJobs: activeJobs || 0,
      totalJobs: totalJobs || 0, completedJobs: completedJobs || 0, acceptedJobs: acceptedJobs || 0,
      pendingReports: pendingReports || 0, totalRevenue,
      pendingJobs: pendingJobs || 0, pendingUsers: pendingUsers || 0,
      pendingApplications: pendingApplications || 0,
    });
  };

  const fetchChartData = async () => {
    // Build last 30 days date labels
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const startDate = days[0] + 'T00:00:00Z';

    const [{ data: signupRows }, { data: jobRows }, { data: revenueRows }] = await Promise.all([
      supabase.from('profiles').select('created_at').gte('created_at', startDate).order('created_at'),
      supabase.from('jobs').select('created_at').gte('created_at', startDate).order('created_at'),
      supabase.from('payment_transactions').select('created_at, amount').eq('status', 'completed').gte('created_at', startDate).order('created_at'),
    ]);

    const countByDay = (rows: { created_at: string }[] | null) => {
      const map: Record<string, number> = {};
      days.forEach(d => (map[d] = 0));
      rows?.forEach(r => { const d = r.created_at?.slice(0, 10); if (d && map[d] !== undefined) map[d]++; });
      return days.map(d => ({ date: d.slice(5), count: map[d] }));
    };

    const revenueByDay = () => {
      const map: Record<string, number> = {};
      days.forEach(d => (map[d] = 0));
      revenueRows?.forEach(r => { const d = r.created_at?.slice(0, 10); if (d && map[d] !== undefined) map[d] += Number(r.amount); });
      return days.map(d => ({ date: d.slice(5), amount: map[d] }));
    };

    setChartData({ signups: countByDay(signupRows), jobs: countByDay(jobRows), revenue: revenueByDay() });
  };

  // ── Fetch functions per tab ──
  const fetchUsers = useCallback(async () => {
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, is_banned, is_approved, created_at, user_reference, district_id, area_id')
      .order('created_at', { ascending: false })
      .limit(200);
    if (userSearch) query = query.or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%,phone.ilike.%${userSearch}%,user_reference.ilike.%${userSearch}%`);
    if (guardianDistrictFilter !== 'all') query = query.eq('district_id', guardianDistrictFilter);
    if (guardianAreaFilter.length > 0) query = query.in('area_id', guardianAreaFilter);
    if (guardianStatusFilter === 'banned') query = query.eq('is_banned', true);
    else if (guardianStatusFilter === 'pending') query = query.eq('is_approved', false).eq('is_banned', false);
    else if (guardianStatusFilter === 'approved') query = query.eq('is_approved', true).eq('is_banned', false);

    const { data } = await query;
    if (!data) { setUsers([]); return; }

    const ids = data.map(u => u.id);
    const [{ data: roles }, { data: jobsRows }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role').in('user_id', ids),
      supabase.from('jobs').select('parent_id').in('parent_id', ids),
    ]);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
    const jobsCountMap = new Map<string, number>();
    jobsRows?.forEach(j => jobsCountMap.set(j.parent_id, (jobsCountMap.get(j.parent_id) || 0) + 1));

    const districtMap = new Map(guardianDistricts.map(d => [d.id, d.name_en]));
    const areaMap = new Map(guardianAreas.map(a => [a.id, a.name_en]));

    let result = data.map(u => ({
      ...u,
      role: roleMap.get(u.id) || 'unknown',
      district_name: u.district_id ? districtMap.get(u.district_id) || null : null,
      area_name: u.area_id ? areaMap.get(u.area_id) || null : null,
      jobs_count: jobsCountMap.get(u.id) || 0,
    })) as UserRow[];
    // Filter to show only parents/guardians
    result = result.filter(u => u.role === 'parent');
    setUsers(result);
  }, [userSearch, guardianDistrictFilter, guardianAreaFilter, guardianStatusFilter, guardianDistricts, guardianAreas]);

  // Reset guardian pagination when filters change
  useEffect(() => { setGuardianPage(1); }, [userSearch, guardianDistrictFilter, guardianAreaFilter, guardianStatusFilter, guardianPageSize]);

  // Reset job pagination when filter or page size changes
  useEffect(() => { setJobPage(1); }, [jobStatusFilter, jobSearch, jobPageSize]);

  // Reset Applications tab pagination when filters/search/selection change
  useEffect(() => { setAppsJobsPage(1); }, [appsJobsSearch, appsJobsPageSize]);
  useEffect(() => { setAppsApplicantsPage(1); }, [allAppsStatusFilter, allAppsSearch, selectedAppsJobId, appsApplicantsPageSize]);

  // Load verification fee from platform settings
  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'verification_fee').maybeSingle()
      .then(({ data }) => {
        const n = Number(data?.value);
        if (Number.isFinite(n) && n >= 0) setVerificationFee(n);
      });
  }, []);

  const fetchVerifications = useCallback(async () => {
    let query = supabase
      .from('tutor_profiles')
      .select('id, user_id, verification_status, education, experience_years, gender, created_at, verification_documents (id, document_type, document_url, status)')
      .order('created_at', { ascending: false }).limit(100);
    if (verificationFilter !== 'all') {
      query = query.eq('verification_status', verificationFilter as 'pending' | 'approved' | 'rejected');
    }
    const { data } = await query;
    if (data) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email, phone').in('id', userIds);
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      setPendingTutors(data.map(t => ({ ...t, profiles: profileMap.get(t.user_id) || { full_name: 'Unknown', email: '', phone: null } })) as unknown as TutorVerification[]);
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
      setVerificationPayments(vPayments.map(p => ({ ...p, profiles: pMap.get(p.user_id) || { full_name: 'Unknown', email: '' } })) as unknown as PaymentRow[]);
    }
  }, [verificationFilter]);

  const fetchJobs = useCallback(async () => {
    let query = supabase
      .from('jobs')
      .select('id, title, job_reference, status, teaching_mode, total_applications, created_at, parent_id, districts (name_en), subjects (name_en)')
      .order('created_at', { ascending: false }).limit(1000);
    if (jobStatusFilter !== 'all') query = query.eq('status', jobStatusFilter as any);
    const { data } = await query;
    if (data) {
      const parentIds = [...new Set(data.map(j => j.parent_id))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', parentIds);
      const pMap = new Map(profs?.map(p => [p.id, p]) || []);
      setJobs(data.map(j => ({ ...j, profiles: pMap.get(j.parent_id) || { full_name: 'Unknown' } })) as unknown as JobRow[]);
    }
  }, [jobStatusFilter]);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, report_type, description, status, created_at, reporter_id, reported_user_id')
      .order('created_at', { ascending: false }).limit(50);
    if (data) {
      const allIds = [...new Set([...data.map(r => r.reporter_id), ...data.map(r => r.reported_user_id)])];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', allIds);
      const pMap = new Map(profs?.map(p => [p.id, p]) || []);
      setReports(data.map(r => ({
        ...r,
        reporter: pMap.get(r.reporter_id) || { full_name: 'Unknown' },
        reported: pMap.get(r.reported_user_id) || { full_name: 'Unknown', email: '' },
      })) as unknown as Report[]);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from('payment_transactions')
      .select('id, amount, currency, status, transaction_id, created_at, completed_at, listing_type, user_id')
      .order('created_at', { ascending: false }).limit(1000);
    if (data) {
      const uids = [...new Set(data.map(p => p.user_id))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', uids);
      const pMap = new Map(profs?.map(p => [p.id, p]) || []);
      setPayments(data.map(p => ({ ...p, profiles: pMap.get(p.user_id) || { full_name: 'Unknown', email: '' } })) as unknown as PaymentRow[]);
    }
  }, []);

  // Reset pagination when page size changes
  useEffect(() => { setPaymentsPage(1); }, [paymentsPageSize]);
  useEffect(() => { setVPaymentsPage(1); }, [vPaymentsPageSize, verificationFilter]);

  // Load data when tab changes
  useEffect(() => {
    if (role !== 'admin') return;
    switch (activeTab) {
      case 'users': fetchUsers(); break;
      case 'guardians': fetchUsers(); break;
      case 'verifications': fetchVerifications(); break;
      case 'jobs': fetchJobs(); break;
      case 'applications': fetchAllApplications(); break;
      case 'reports': fetchReports(); break;
      case 'payments': fetchPayments(); break;
    }
  }, [activeTab, role, fetchUsers, fetchVerifications, fetchJobs, fetchAllApplications, fetchReports, fetchPayments]);

  // Load districts/areas once for guardian filters
  useEffect(() => {
    if (role !== 'admin') return;
    (async () => {
      const [{ data: d }, { data: a }] = await Promise.all([
        supabase.from('districts').select('id, name_en').order('name_en'),
        supabase.from('areas').select('id, name_en, district_id').order('name_en'),
      ]);
      if (d) setGuardianDistricts(d);
      if (a) setGuardianAreas(a);
    })();
  }, [role]);

  // ── Actions ──
  const handleVerifyTutor = async (tutorId: string, status: 'approved' | 'rejected') => {
    setProcessing(true);
    const { error } = await supabase.from('tutor_profiles').update({
      verification_status: status,
      verified_at: status === 'approved' ? new Date().toISOString() : null,
    }).eq('id', tutorId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Success', description: `Tutor ${status}` });
      setSelectedTutor(null);
      fetchVerifications();
      fetchStats();
    }
    setProcessing(false);
  };

  const handleApproveUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'User approved' }); fetchUsers(); fetchStats(); }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    setProcessing(true);
    const { error } = await supabase.from('profiles').update({
      is_banned: ban,
      banned_at: ban ? new Date().toISOString() : null,
      banned_reason: ban ? adminNotes : null,
    }).eq('id', userId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Success', description: `User ${ban ? 'banned' : 'unbanned'}` });
      setSelectedUser(null);
      setAdminNotes('');
      fetchUsers();
    }
    setProcessing(false);
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed', banUserId?: string) => {
    setProcessing(true);
    const { error } = await supabase.from('reports').update({
      status, admin_notes: adminNotes,
      reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', reportId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      if (banUserId) await handleBanUser(banUserId, true);
      toast({ title: 'Success', description: `Report ${status}` });
      setSelectedReport(null);
      setAdminNotes('');
      fetchReports();
      fetchStats();
    }
    setProcessing(false);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Job deleted' }); fetchJobs(); fetchStats(); }
  };

  const handleUpdateJobStatus2Placeholder = null;

  const handleUpdateJobStatus = async (jobId: string, status: string) => {
    const { error } = await supabase.from('jobs').update({ status: status as any }).eq('id', jobId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Job status updated to ${status}` }); fetchJobs(); fetchStats(); }
  };

  const openEditJob = async (jobId: string) => {
    const [{ data }, { data: dists }, { data: ars }, { data: subs }] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).single(),
      supabase.from('districts').select('id, name_en').order('name_en'),
      supabase.from('areas').select('id, name_en, district_id').order('name_en'),
      supabase.from('subjects').select('id, name_en').order('name_en'),
    ]);
    if (dists) setEditJobDistricts(dists);
    if (ars) setEditJobAreas(ars);
    if (subs) setEditJobSubjects(subs);
    if (data) {
      setEditingJob(data);
      setEditJobForm({
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'open',
        teaching_mode: data.teaching_mode || 'in_person',
        budget_min: data.budget_min || 0,
        budget_max: data.budget_max || 0,
        district_id: data.district_id || '',
        area_id: data.area_id || '',
        class_level: data.class_level || '',
        subject_id: data.subject_id || '',
        days_per_week: data.days_per_week || 0,
        duration_hours: data.duration_hours || 0,
        preferred_time: data.preferred_time || '',
        fixed_time: (data as any).fixed_time || '',
        preferred_tutor_gender: data.preferred_tutor_gender || 'any',
        student_gender: data.student_gender || '',
        student_age: data.student_age || '',
        number_of_students: data.number_of_students || 1,
        location_details: data.location_details || '',
        special_requirements: data.special_requirements || '',
        start_date: data.start_date || '',
      });
    }
  };

  const handleSaveJob = async () => {
    if (!editingJob) return;
    setProcessing(true);
    const { error } = await supabase.from('jobs').update({
      title: editJobForm.title,
      description: editJobForm.description,
      status: editJobForm.status as any,
      teaching_mode: editJobForm.teaching_mode as any,
      budget_min: editJobForm.budget_min || null,
      budget_max: editJobForm.budget_max || null,
      district_id: editJobForm.district_id || null,
      area_id: editJobForm.area_id || null,
      class_level: editJobForm.class_level || null,
      subject_id: editJobForm.subject_id || null,
      days_per_week: editJobForm.days_per_week || null,
      duration_hours: editJobForm.duration_hours || null,
      preferred_time: editJobForm.preferred_time || null,
      fixed_time: editJobForm.fixed_time || null,
      preferred_tutor_gender: (editJobForm.preferred_tutor_gender as any) || null,
      student_gender: (editJobForm.student_gender as any) || null,
      student_age: editJobForm.student_age || null,
      number_of_students: editJobForm.number_of_students || 1,
      location_details: editJobForm.location_details || null,
      special_requirements: editJobForm.special_requirements || null,
      start_date: editJobForm.start_date || null,
    }).eq('id', editingJob.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Job updated successfully' }); setEditingJob(null); fetchJobs(); fetchStats(); }
    setProcessing(false);
  };

  const handleImpersonate = async (userId: string) => {
    setProcessing(true);
    const { error } = await impersonateUser(userId);
    setProcessing(false);
    if (error) {
      toast({ title: 'Impersonation Failed', description: error, variant: 'destructive' });
      return;
    }
    // The auth context now has the impersonated user's session, navigate to their dashboard
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (data && data.length > 0) {
      const targetRole = data[0].role;
      if (targetRole === 'tutor') navigate('/tutor/dashboard');
      else if (targetRole === 'parent') navigate('/parent/dashboard');
    }
    toast({ title: 'Impersonation Active', description: 'You are now operating as this user. All actions use their real permissions.' });
  };

  // Open dialog to view jobs posted by a parent
  const handleViewParentJobs = async (parentId: string, parentName: string) => {
    setViewingParentJobs({ id: parentId, name: parentName });
    setLoadingParentJobs(true);
    setParentJobs([]);
    const { data } = await supabase
      .from('jobs')
      .select('id, title, job_reference, status, total_applications, created_at, districts (name_en), subjects (name_en)')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });
    setParentJobs(data || []);
    setLoadingParentJobs(false);
  };

  // Export filtered guardians to CSV
  const handleExportGuardiansCSV = () => {
    const esc = (v: string | number | null | undefined) => {
      const s = (v ?? '').toString().replace(/"/g, '""');
      return `"${s}"`;
    };
    const headers = ['Reference', 'Name', 'Email', 'Phone', 'District', 'Area/Thana', 'Status', 'Jobs Posted', 'Joined'];
    const rows = users.map(u => [
      esc(u.user_reference || ''),
      esc(u.full_name),
      esc(u.email),
      esc(u.phone || ''),
      esc(u.district_name || ''),
      esc(u.area_name || ''),
      esc(u.is_banned ? 'Banned' : u.is_approved ? 'Approved' : 'Pending'),
      esc(u.jobs_count || 0),
      esc(format(new Date(u.created_at), 'yyyy-MM-dd')),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guardians-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export complete', description: `${users.length} guardians exported.` });
  };

  if (loading || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sidebarGroups = [
    {
      label: 'Dashboard',
      items: [
        { title: 'Overview', value: 'overview', icon: BarChart3 },
      ],
    },
    {
      label: 'Users',
      items: [
        { title: 'Tutor Profiles', value: 'tutor_profiles', icon: GraduationCap },
        { title: 'Tutor Editor', value: 'tutor_editor', icon: Pencil },
        { title: 'Guardians / Parents', value: 'guardians', icon: Users },
        { title: 'Verifications', value: 'verifications', icon: UserCheck, badge: stats.pendingVerifications },
        { title: 'Create User', value: 'create_user', icon: UserPlus },
        { title: 'Import Tutors', value: 'import_tutors', icon: Download, href: '/admin/import-tutors' },
      ],
    },
    {
      label: 'Jobs & Tutoring',
      items: [
        { title: 'Jobs', value: 'jobs', icon: Briefcase },
        { title: 'Applications', value: 'applications', icon: FileText, badge: stats.pendingApplications },
        { title: 'Post Job', value: 'post_job', icon: Plus },
        { title: 'Demo Requests', value: 'demo_requests', icon: BookOpen },
      ],
    },
    {
      label: 'Finance',
      items: [
        { title: 'Payments', value: 'payments', icon: CreditCard },
        { title: 'Revenue & Payouts', value: 'revenue', icon: Wallet },
        { title: 'Subscriptions', value: 'subscriptions', icon: Package },
      ],
    },
    {
      label: 'Communication',
      items: [
        { title: 'Broadcast', value: 'broadcast', icon: Megaphone },
        { title: 'Contact Messages', value: 'contacts', icon: Mail },
        { title: 'Support Tickets', value: 'tickets', icon: LifeBuoy },
      ],
    },
    {
      label: 'Analytics & Reports',
      items: [
        { title: 'Reports', value: 'reports', icon: AlertTriangle, badge: stats.pendingReports },
        { title: 'Geographic Analytics', value: 'geographic', icon: MapPin },
        { title: 'Referral Sources', value: 'referrals', icon: TrendingUp },
      ],
    },
    {
      label: 'System',
      items: [
        { title: 'Sub-Admin Roles', value: 'rbac', icon: ShieldCheck },
        { title: 'Platform Data', value: 'platform_data', icon: BookOpen },
        { title: 'Settings', value: 'settings', icon: Settings },
      ],
    },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': case 'active': case 'approved': case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'pending': case 'pending_approval': return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected': case 'cancelled': case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const AdminSidebarInner = () => {
    const { isMobile, setOpenMobile } = useSidebar();
    const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };
    return (
      <Sidebar collapsible="offcanvas" className="border-r border-border/50">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>
              </div>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setOpenMobile(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </SidebarGroupLabel>
          </SidebarGroup>
          {sidebarGroups.map((group) => {
            const groupIsActive = group.items.some(i => i.value === activeTab);
            return (
              <Collapsible key={group.label} defaultOpen={groupIsActive || group.label === 'Dashboard'}>
                <SidebarGroup className="py-0">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
                    <span>{group.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const itemHref = (item as any).href as string | undefined;
                          const buttonClass = `w-full justify-start text-sm ${activeTab === item.value ? 'bg-primary/8 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`;
                          return (
                            <SidebarMenuItem key={item.value}>
                              {itemHref ? (
                                <SidebarMenuButton asChild className={buttonClass}>
                                  <Link to={itemHref} onClick={closeOnMobile}>
                                    <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                                    <span className="flex-1 text-left truncate">{item.title}</span>
                                  </Link>
                                </SidebarMenuButton>
                              ) : (
                                <SidebarMenuButton
                                  onClick={() => {
                                    setActiveTab(item.value);
                                    if (item.value === 'applications' && (item as any).badge) {
                                      setAllAppsStatusFilter('pending');
                                      setSelectedAppIds(new Set());
                                    }
                                    closeOnMobile();
                                  }}
                                  className={buttonClass}
                                >
                                  <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                                  <span className="flex-1 text-left truncate">{item.title}</span>
                                  {'badge' in item && item.badge ? (
                                    <span className="ml-auto text-[10px] font-medium bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">{item.badge}</span>
                                  ) : null}
                                </SidebarMenuButton>
                              )}
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          })}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm" onClick={closeOnMobile}>
                      <Home className="h-4 w-4" />
                      <span>Back to Site</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <AdminSidebarInner />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-50 h-12 flex items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Super Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => { supabase.auth.signOut(); navigate('/'); }}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {/* ═══════ OVERVIEW TAB ═══════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-6xl">
                <div>
                  <h1 className="text-xl font-semibold">Overview</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Platform health at a glance</p>
                </div>

                {/* Key metrics — compact grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'Users', value: stats.totalUsers, icon: Users },
                    { label: 'Tutors', value: stats.totalTutors, icon: GraduationCap },
                    { label: 'Parents', value: stats.totalParents, icon: Users },
                    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase },
                    { label: 'Accepted', value: stats.acceptedJobs, icon: CheckCircle2 },
                    { label: 'Total Jobs', value: stats.totalJobs, icon: FileText },
                    { label: 'Revenue', value: `৳${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                      </div>
                      <div className="text-lg font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Pending items — only show if there are any */}
                {(stats.pendingVerifications > 0 || stats.pendingJobs > 0 || stats.pendingUsers > 0 || stats.pendingReports > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Pending Verifications', count: stats.pendingVerifications, tab: 'verifications' },
                      { label: 'Pending Jobs', count: stats.pendingJobs, tab: 'jobs', filter: () => setJobStatusFilter('pending_approval') },
                      { label: 'Pending Users', count: stats.pendingUsers, tab: 'users' },
                      { label: 'Pending Reports', count: stats.pendingReports, tab: 'reports' },
                    ].filter(p => p.count > 0).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => { p.filter?.(); setActiveTab(p.tab); }}
                        className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm hover:bg-warning/10 transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5 text-warning" />
                        <span className="font-medium">{p.count}</span>
                        <span className="text-muted-foreground">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Charts — 2 column, compact */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">User Signups</span>
                      <span className="text-[11px] text-muted-foreground">30 days</span>
                    </div>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.signups}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" className="text-muted-foreground" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9 }} width={24} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))' }} />
                          <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={1.5} name="Signups" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Job Postings</span>
                      <span className="text-[11px] text-muted-foreground">30 days</span>
                    </div>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.jobs}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9 }} width={24} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="count" fill="hsl(var(--primary)/0.6)" radius={[2, 2, 0, 0]} name="Jobs" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ GUARDIANS / PARENTS TAB ═══════ */}
            {activeTab === 'guardians' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h1 className="text-xl font-semibold">Guardians / Parents <span className="text-sm font-normal text-muted-foreground">({users.length})</span></h1>
                  <Button onClick={handleExportGuardiansCSV} variant="outline" size="sm" disabled={users.length === 0}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </div>

                {/* Filters */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, email, phone, or reference..."
                          className="pl-10"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                        />
                      </div>
                      <Select
                        value={guardianDistrictFilter}
                        onValueChange={(v) => { setGuardianDistrictFilter(v); setGuardianAreaFilter([]); }}
                      >
                        <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="District" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="all">All Districts</SelectItem>
                          {guardianDistricts.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={guardianStatusFilter} onValueChange={setGuardianStatusFilter}>
                        <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={fetchUsers}><Search className="h-4 w-4 mr-1" /> Apply</Button>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-3 items-start">
                      <div className="flex-1 w-full">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Area / Thana (multi-select)</label>
                        <MultiSearchableSelect
                          options={guardianAreas
                            .filter(a => guardianDistrictFilter === 'all' || a.district_id === guardianDistrictFilter)
                            .map(a => ({ value: a.id, label: a.name_en }))}
                          values={guardianAreaFilter}
                          onValuesChange={setGuardianAreaFilter}
                          placeholder={guardianDistrictFilter === 'all' ? 'Select district first or search all areas' : 'Select areas/thanas'}
                          searchPlaceholder="Search area..."
                        />
                      </div>
                      {(guardianDistrictFilter !== 'all' || guardianAreaFilter.length > 0 || guardianStatusFilter !== 'all' || userSearch) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setGuardianDistrictFilter('all');
                            setGuardianAreaFilter([]);
                            setGuardianStatusFilter('all');
                            setUserSearch('');
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Clear filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reference</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Jobs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No guardians match your filters</TableCell></TableRow>
                          ) : users.slice((guardianPage - 1) * guardianPageSize, guardianPage * guardianPageSize).map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="text-xs font-mono text-muted-foreground">{u.user_reference || '—'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url || ''} />
                                    <AvatarFallback className="text-xs">{u.full_name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{u.full_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div>{u.email}</div>
                                <div className="text-muted-foreground">{u.phone || '—'}</div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div>{u.district_name || '—'}</div>
                                <div className="text-muted-foreground">{u.area_name || '—'}</div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleViewParentJobs(u.id, u.full_name)}
                                  disabled={!u.jobs_count}
                                  title="View posted jobs"
                                >
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {u.jobs_count || 0}
                                </Button>
                              </TableCell>
                              <TableCell>
                                {u.is_banned ? (
                                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                                ) : !u.is_approved ? (
                                  <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pending</Badge>
                                ) : (
                                  <Badge className="bg-success/10 text-success border-success/20 text-xs">Approved</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatExactDate(new Date(u.created_at))}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button variant="ghost" size="sm" onClick={() => handleImpersonate(u.id)} title={`Login as ${u.full_name}`}>
                                    <LogIn className="h-4 w-4 text-primary" />
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild title="Edit Parent Profile">
                                    <Link to={`/admin/parent/${u.id}`}><Pencil className="h-4 w-4" /></Link>
                                  </Button>
                                  {!u.is_approved && !u.is_banned && (
                                    <Button variant="ghost" size="sm" onClick={() => handleApproveUser(u.id)} title="Approve User">
                                      <UserCheck className="h-4 w-4 text-success" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelectedUser(u); setAdminNotes(''); }}
                                    title={u.is_banned ? 'Unban user' : 'Ban user'}
                                  >
                                    {u.is_banned ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {users.length > 0 && (() => {
                  const totalPages = Math.max(1, Math.ceil(users.length / guardianPageSize));
                  const page = Math.min(guardianPage, totalPages);
                  const start = (page - 1) * guardianPageSize + 1;
                  const end = Math.min(page * guardianPageSize, users.length);
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                      <div className="text-xs text-muted-foreground">Showing {start}–{end} of {users.length}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={String(guardianPageSize)} onValueChange={(v) => { setGuardianPageSize(Number(v)); setGuardianPage(1); }}>
                          <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setGuardianPage(1)}>« First</Button>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setGuardianPage(page - 1)}>Prev</Button>
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setGuardianPage(page + 1)}>Next</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setGuardianPage(totalPages)}>Last »</Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Parent posted jobs dialog */}
            <Dialog open={!!viewingParentJobs} onOpenChange={() => setViewingParentJobs(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Jobs posted by {viewingParentJobs?.name}</DialogTitle>
                </DialogHeader>
                {loadingParentJobs ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
                ) : parentJobs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">No jobs posted yet.</div>
                ) : (
                  <ScrollArea className="max-h-[60vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>District</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Apps</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parentJobs.map(j => (
                          <TableRow key={j.id}>
                            <TableCell className="text-xs font-mono">{j.job_reference || '—'}</TableCell>
                            <TableCell className="text-sm font-medium">{j.title}</TableCell>
                            <TableCell className="text-xs">{j.districts?.name_en || '—'}</TableCell>
                            <TableCell className="text-xs">{j.subjects?.name_en || '—'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs capitalize">{j.status?.replace('_', ' ')}</Badge></TableCell>
                            <TableCell className="text-xs">{j.total_applications || 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatExactDate(new Date(j.created_at))}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild><Link to={`/jobs/${j.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </DialogContent>
            </Dialog>


            {/* ═══════ VERIFICATIONS TAB ═══════ */}
            {activeTab === 'verifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h1 className="text-xl font-semibold">Tutor Verifications</h1>
                  <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tutors</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pendingTutors.length === 0 ? (
                  <Card><CardContent className="py-16 text-center">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">No tutors found</h3>
                    <p className="text-muted-foreground">No tutors match the selected filter</p>
                  </CardContent></Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tutor</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Education</TableHead>
                              <TableHead>Experience</TableHead>
                              <TableHead>Docs</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingTutors.map((tutor) => (
                              <TableRow key={tutor.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-tutor/10 flex items-center justify-center">
                                      <GraduationCap className="h-4 w-4 text-tutor" />
                                    </div>
                                    <span className="font-medium text-sm">{tutor.profiles?.full_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">{tutor.profiles?.email}</TableCell>
                                <TableCell className="text-sm">{tutor.education || '—'}</TableCell>
                                <TableCell className="text-sm">{tutor.experience_years} yrs</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    <FileCheck className="h-3 w-3 mr-1" />
                                    {tutor.verification_documents?.length || 0}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-xs capitalize ${statusColor(tutor.verification_status)}`}>
                                    {tutor.verification_status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button variant="ghost" size="sm" asChild title="Edit Profile">
                                      <Link to={`/admin/tutor/${tutor.user_id}`}><Pencil className="h-4 w-4" /></Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedTutor(tutor)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {tutor.verification_status !== 'approved' && (
                                      <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => handleVerifyTutor(tutor.id, 'approved')} disabled={processing}>
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {tutor.verification_status === 'approved' && (
                                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleVerifyTutor(tutor.id, 'rejected')} disabled={processing}>
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {tutor.verification_status === 'pending' && (
                                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleVerifyTutor(tutor.id, 'rejected')} disabled={processing}>
                                        <XCircle className="h-4 w-4" />
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
                          {verificationPayments.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No verification payments yet</TableCell></TableRow>
                          ) : verificationPayments.slice((vPaymentsPage - 1) * vPaymentsPageSize, vPaymentsPage * vPaymentsPageSize).map((p) => (
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
                {verificationPayments.length > 0 && (() => {
                  const totalPages = Math.max(1, Math.ceil(verificationPayments.length / vPaymentsPageSize));
                  const page = Math.min(vPaymentsPage, totalPages);
                  const start = (page - 1) * vPaymentsPageSize + 1;
                  const end = Math.min(page * vPaymentsPageSize, verificationPayments.length);
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                      <div className="text-xs text-muted-foreground">Showing {start}–{end} of {verificationPayments.length}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={String(vPaymentsPageSize)} onValueChange={(v) => { setVPaymentsPageSize(Number(v)); setVPaymentsPage(1); }}>
                          <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setVPaymentsPage(1)}>« First</Button>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setVPaymentsPage(page - 1)}>Prev</Button>
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setVPaymentsPage(page + 1)}>Next</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setVPaymentsPage(totalPages)}>Last »</Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══════ JOBS TAB ═══════ */}
            {activeTab === 'jobs' && (() => {
              const q = jobSearch.trim().toLowerCase();
              const filteredJobs = q
                ? jobs.filter(j =>
                    (j.job_reference || '').toLowerCase().includes(q) ||
                    (j.title || '').toLowerCase().includes(q) ||
                    ((j.profiles as any)?.full_name || '').toLowerCase().includes(q)
                  )
                : jobs;
              return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h1 className="text-xl font-semibold">Job Management</h1>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                        placeholder="Search by reference, title, or guardian"
                        className="pl-8 h-9"
                      />
                    </div>
                    <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reference</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Posted By</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Apps</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Posted</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredJobs.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
                          ) : filteredJobs.slice((jobPage - 1) * jobPageSize, jobPage * jobPageSize).map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-mono text-xs">{job.job_reference || '—'}</TableCell>
                              <TableCell className="font-medium text-sm max-w-[200px] truncate">{job.title}</TableCell>
                              <TableCell className="text-sm">{(job.profiles as any)?.full_name}</TableCell>
                              <TableCell className="text-sm">{(job.districts as any)?.name_en}</TableCell>
                              <TableCell className="text-sm">{(job.subjects as any)?.name_en || '—'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { setViewingJobApps({ jobId: job.id, jobTitle: job.title }); fetchJobApplications(job.id); }}>
                                  <Users className="h-3 w-3" /> {job.total_applications}
                                </Button>
                              </TableCell>
                              <TableCell><Badge className={`text-xs capitalize ${statusColor(job.status)}`}>{job.status?.replace('_', ' ')}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(job.created_at))}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end flex-wrap">
                                  <Button variant="ghost" size="sm" asChild><Link to={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                  <Button variant="ghost" size="sm" onClick={() => openEditJob(job.id)} title="Edit Job"><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setViewingJobApps({ jobId: job.id, jobTitle: job.title }); fetchJobApplications(job.id); }} title="View Applications & Assign Tutor">
                                    <UserCheck className="h-3.5 w-3.5" /> Assign
                                  </Button>
                                  {job.status === 'pending_approval' && (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => handleUpdateJobStatus(job.id, 'open')} title="Approve">
                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleUpdateJobStatus(job.id, 'cancelled')} title="Reject">
                                        <XCircle className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                  {job.status === 'open' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleUpdateJobStatus(job.id, 'cancelled')}>
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {filteredJobs.length > 0 && (() => {
                  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize));
                  const page = Math.min(jobPage, totalPages);
                  const start = (page - 1) * jobPageSize + 1;
                  const end = Math.min(page * jobPageSize, filteredJobs.length);
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                      <div className="text-xs text-muted-foreground">Showing {start}–{end} of {filteredJobs.length}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={String(jobPageSize)} onValueChange={(v) => { setJobPageSize(Number(v)); setJobPage(1); }}>
                          <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setJobPage(1)}>« First</Button>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setJobPage(page - 1)}>Prev</Button>
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setJobPage(page + 1)}>Next</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setJobPage(totalPages)}>Last »</Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              );
            })()}

            {/* ═══════ APPLICATIONS TAB (Two-level drill-down) ═══════ */}
            {activeTab === 'applications' && (() => {
              const STATUS_OPTS = [
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'shortlisted', label: 'Shortlisted' },
                { key: 'invited_to_demo', label: 'Invited' },
                { key: 'waiting', label: 'Waiting' },
                { key: 'accepted', label: 'Accepted' },
                { key: 'rejected', label: 'Rejected' },
                { key: 'withdrawn', label: 'Withdrawn' },
              ] as const;

              // ───── LEVEL 1: Jobs list ─────
              if (appsView === 'jobs' || !selectedAppsJobId) {
                // Group apps by job_id
                const jobMap = new Map<string, { job: any; apps: any[] }>();
                for (const a of allApplications) {
                  const jid = a.job_id;
                  if (!jid) continue;
                  if (!jobMap.has(jid)) jobMap.set(jid, { job: a.jobs, apps: [] });
                  jobMap.get(jid)!.apps.push(a);
                }
                const jobsList = Array.from(jobMap.entries()).map(([jid, { job, apps }]) => ({
                  jid,
                  job,
                  total: apps.length,
                  pending: apps.filter(a => a.status === 'pending').length,
                  shortlisted: apps.filter(a => a.status === 'shortlisted').length,
                  latest: apps.reduce((m, a) => (new Date(a.created_at) > new Date(m) ? a.created_at : m), apps[0].created_at),
                }));
                const search = appsJobsSearch.trim().toLowerCase();
                const filteredJobs = jobsList.filter(j => {
                  if (!search) return true;
                  // Match against job title, ref, parent name/email/phone/user_reference, or any applicant's tutor name/email/phone/user_reference
                  const apps = allApplications.filter(a => a.job_id === j.jid);
                  const haystacks: string[] = [
                    j.job?.title, j.job?.job_reference,
                    apps[0]?.parent_profile?.full_name, apps[0]?.parent_profile?.email,
                    apps[0]?.parent_profile?.phone, apps[0]?.parent_profile?.user_reference,
                    ...apps.flatMap(a => [
                      a.tutor_profile?.full_name, a.tutor_profile?.email,
                      a.tutor_profile?.phone, a.tutor_profile?.user_reference,
                    ]),
                  ].filter(Boolean).map(String);
                  return haystacks.some(h => h.toLowerCase().includes(search));
                }).sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime());

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h1 className="text-xl font-semibold">Applications</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Search by job title, reference, parent/tutor name, email, phone, or user ID.</p>
                      </div>
                      <Input
                        placeholder="Search title, ref, name, email, phone, user ID…"
                        value={appsJobsSearch}
                        onChange={(e) => setAppsJobsSearch(e.target.value)}
                        className="w-96 h-9"
                      />
                    </div>

                    <Card>
                      <CardContent className="p-0">
                        <ScrollArea className="w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-mono">Ref ID</TableHead>
                                <TableHead>Job Name</TableHead>
                                <TableHead>Guardian</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Posted</TableHead>
                                <TableHead>Job Status</TableHead>
                                <TableHead>Applicants</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loadingAllApps ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                              ) : filteredJobs.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No applications yet.</TableCell></TableRow>
                              ) : filteredJobs.slice((appsJobsPage - 1) * appsJobsPageSize, appsJobsPage * appsJobsPageSize).map(({ jid, job, total, pending, shortlisted, latest }) => {
                                const guardianApp = allApplications.find(a => a.job_id === jid);
                                const guardianName = guardianApp?.parent_profile?.full_name || '—';
                                const guardianPhone = guardianApp?.parent_profile?.phone || '—';
                                return (
                                <TableRow
                                  key={jid}
                                  className="cursor-pointer"
                                  onClick={() => { setSelectedAppsJobId(jid); setAppsView('applicants'); setSelectedAppIds(new Set()); }}
                                >
                                  <TableCell className="text-xs font-mono">{job?.job_reference || '—'}</TableCell>
                                  <TableCell>
                                    <div className="text-sm font-medium max-w-[280px] truncate">{job?.title || '—'}</div>
                                  </TableCell>
                                  <TableCell className="text-sm max-w-[160px] truncate">{guardianName}</TableCell>
                                  <TableCell className="text-xs font-mono whitespace-nowrap">{guardianPhone}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(latest))}</TableCell>
                                  <TableCell>
                                    <Badge className={`text-xs capitalize ${statusColor(job?.status)}`}>{(job?.status || '—').replace('_', ' ')}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" />{total}</Badge>
                                      {pending > 0 && <Badge variant="outline" className="text-xs">Pending: {pending}</Badge>}
                                      {shortlisted > 0 && <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" />{shortlisted}</Badge>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1"
                                      onClick={(e) => { e.stopPropagation(); setSelectedAppsJobId(jid); setAppsView('applicants'); setSelectedAppIds(new Set()); }}
                                    >
                                      <UserCheck className="h-3.5 w-3.5" /> View Applicants
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {filteredJobs.length > 0 && (() => {
                      const totalPages = Math.max(1, Math.ceil(filteredJobs.length / appsJobsPageSize));
                      const page = Math.min(appsJobsPage, totalPages);
                      const start = (page - 1) * appsJobsPageSize + 1;
                      const end = Math.min(page * appsJobsPageSize, filteredJobs.length);
                      return (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                          <div className="text-xs text-muted-foreground">Showing {start}–{end} of {filteredJobs.length}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select value={String(appsJobsPageSize)} onValueChange={(v) => { setAppsJobsPageSize(Number(v)); setAppsJobsPage(1); }}>
                              <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setAppsJobsPage(1)}>« First</Button>
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setAppsJobsPage(page - 1)}>Prev</Button>
                            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setAppsJobsPage(page + 1)}>Next</Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setAppsJobsPage(totalPages)}>Last »</Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              }

              // ───── LEVEL 2: Applicants for selected job ─────
              const jobApps = allApplications.filter(a => a.job_id === selectedAppsJobId);
              const selectedJob = jobApps[0]?.jobs;
              const counts: Record<string, number> = { all: jobApps.length };
              for (const o of STATUS_OPTS) if (o.key !== 'all') counts[o.key] = jobApps.filter(a => a.status === o.key).length;

              const visible = jobApps.filter(a => {
                if (allAppsStatusFilter !== 'all' && a.status !== allAppsStatusFilter) return false;
                if (!allAppsSearch.trim()) return true;
                const s = allAppsSearch.toLowerCase();
                return (
                  a.tutor_profile?.full_name?.toLowerCase().includes(s) ||
                  a.tutor_profile?.email?.toLowerCase().includes(s) ||
                  (a.tutor_profile?.phone || '').toLowerCase().includes(s) ||
                  (a.tutor_profile?.user_reference || '').toLowerCase().includes(s) ||
                  (a.jobs?.title || '').toLowerCase().includes(s) ||
                  (a.jobs?.job_reference || '').toLowerCase().includes(s)
                );
              });

              return (
                <div className="space-y-5">
                  {/* Breadcrumb header */}
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="space-y-2 min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => { setAppsView('jobs'); setSelectedAppsJobId(null); setSelectedAppIds(new Set()); }}
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to Jobs
                      </Button>
                      <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{selectedJob?.title || 'Applicants'}</h1>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/80">{selectedJob?.job_reference || '—'}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <Badge className={`text-[10px] capitalize ${statusColor(selectedJob?.status)}`}>{(selectedJob?.status || '—').replace('_', ' ')}</Badge>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{jobApps.length} applicant{jobApps.length === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    </div>
                    <Input
                      placeholder="Search name, email, phone, user ID, job title…"
                      value={allAppsSearch}
                      onChange={(e) => setAllAppsSearch(e.target.value)}
                      className="w-80 h-9"
                    />
                  </div>

                  {/* Job requirement details panel */}
                  {selectedJob && (() => {
                    const fields: { label: string; value: React.ReactNode }[] = [];
                    if (selectedJob.class_level) fields.push({ label: 'Class Level', value: selectedJob.class_level });
                    if (selectedJob.budget_min || selectedJob.budget_max) fields.push({ label: 'Budget', value: `৳${selectedJob.budget_min ?? '—'} – ৳${selectedJob.budget_max ?? '—'}` });
                    if (selectedJob.teaching_mode) fields.push({ label: 'Mode', value: <span className="capitalize">{String(selectedJob.teaching_mode).replace('_', ' ')}</span> });
                    if (selectedJob.days_per_week) fields.push({ label: 'Days / Week', value: selectedJob.days_per_week });
                    if (selectedJob.duration_hours) fields.push({ label: 'Duration', value: `${selectedJob.duration_hours} hr` });
                    if (selectedJob.preferred_time || selectedJob.fixed_time) fields.push({ label: 'Time', value: selectedJob.fixed_time || selectedJob.preferred_time });
                    if (selectedJob.start_date) fields.push({ label: 'Start Date', value: new Date(selectedJob.start_date).toLocaleDateString() });
                    if (selectedJob.number_of_students) fields.push({ label: 'Students', value: selectedJob.number_of_students });
                    if (selectedJob.student_age) fields.push({ label: 'Student Age', value: selectedJob.student_age });
                    if (selectedJob.student_gender) fields.push({ label: 'Student Gender', value: <span className="capitalize">{selectedJob.student_gender}</span> });
                    if (selectedJob.preferred_tutor_gender && selectedJob.preferred_tutor_gender !== 'any') fields.push({ label: 'Preferred Tutor', value: <span className="capitalize">{selectedJob.preferred_tutor_gender}</span> });
                    if (selectedJob.student_school_name) fields.push({ label: 'School', value: selectedJob.student_school_name });

                    return (
                      <Card className="overflow-hidden border-border/60">
                        <div className="bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent px-5 py-3 border-b border-border/60 flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <h3 className="text-sm font-semibold">Job Requirements</h3>
                        </div>
                        <CardContent className="p-5 space-y-5">
                          {/* Field grid */}
                          {fields.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3.5">
                              {fields.map((f) => (
                                <div key={f.label} className="min-w-0">
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">{f.label}</div>
                                  <div className="text-sm font-medium text-foreground mt-0.5 truncate">{f.value}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Location */}
                          {(selectedJob.districts?.name_en || selectedJob.areas?.name_en || selectedJob.location_details) && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/40">
                              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div className="text-sm min-w-0">
                                <div className="font-medium">
                                  {[selectedJob.areas?.name_en, selectedJob.districts?.name_en].filter(Boolean).join(', ') || '—'}
                                </div>
                                {selectedJob.location_details && (
                                  <div className="text-xs text-muted-foreground mt-0.5">{selectedJob.location_details}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Subjects */}
                          {Array.isArray(selectedJob.job_subjects) && selectedJob.job_subjects.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-2">Subjects</div>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedJob.job_subjects.map((js: any, i: number) => (
                                  <Badge key={js?.subjects?.id || i} className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                                    {js?.subjects?.name_en || '—'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description / requirements split */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {selectedJob.description && (
                              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-1.5">Description</div>
                                <p className="text-xs whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                              </div>
                            )}
                            {selectedJob.special_requirements && (
                              <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-medium mb-1.5">Special Requirements</div>
                                <p className="text-xs whitespace-pre-wrap leading-relaxed">{selectedJob.special_requirements}</p>
                              </div>
                            )}
                          </div>

                          {/* Parent contact */}
                          {jobApps[0]?.parent_profile && (
                            <div className="pt-4 border-t border-border/60">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-2.5">Posted By (Parent)</div>
                              <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg bg-muted/30 border border-border/40">
                                <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                                  <AvatarImage src={jobApps[0].parent_profile.avatar_url || ''} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{jobApps[0].parent_profile.full_name?.charAt(0) || 'P'}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-sm font-semibold flex items-center gap-2">
                                    {jobApps[0].parent_profile.full_name || '—'}
                                    {jobApps[0].parent_profile.user_reference && (
                                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">{jobApps[0].parent_profile.user_reference}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                                    {jobApps[0].parent_profile.phone && (
                                      <a href={`tel:${jobApps[0].parent_profile.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{jobApps[0].parent_profile.phone}</a>
                                    )}
                                    {jobApps[0].parent_profile.email && (
                                      <a href={`mailto:${jobApps[0].parent_profile.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" />{jobApps[0].parent_profile.email}</a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Status filter chips scoped to this job */}
                  <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-lg bg-muted/40 border border-border/40 w-fit">
                    {STATUS_OPTS.map(opt => {
                      const count = counts[opt.key] || 0;
                      const active = allAppsStatusFilter === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setAllAppsStatusFilter(opt.key)}
                          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {opt.label}
                          <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Card className="border-border/60">
                    <CardContent className="p-0">
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Tutor ID</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Tutor</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Contact</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Last Education</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Rate</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Bio</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Status</TableHead>
                              <TableHead className="text-[10px] uppercase tracking-wider font-semibold">Verified / Rating</TableHead>
                              <TableHead className="text-right text-[10px] uppercase tracking-wider font-semibold">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visible.length === 0 ? (
                              <TableRow><TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <div className="text-sm">No applicants match this filter.</div>
                              </TableCell></TableRow>
                            ) : visible.slice((appsApplicantsPage - 1) * appsApplicantsPageSize, appsApplicantsPage * appsApplicantsPageSize).map((app) => {
                              const isFinal = app.status === 'accepted' || app.status === 'rejected' || app.status === 'withdrawn';
                              const tp = app.tutor_profile;
                              const tprof = app.tutor_profiles as any;
                              const edu = app.tutor_last_education;
                              const bio = tprof?.bio || '';
                              return (
                                <TableRow key={app.id} className="hover:bg-muted/20">
                                  <TableCell className="text-xs font-mono text-muted-foreground align-top">
                                    <div className="text-foreground/80">{tp?.user_reference || '—'}</div>
                                    <div className="text-[10px] mt-1 font-sans">{formatExactDate(new Date(app.created_at))}</div>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                                        <AvatarImage src={tp?.avatar_url || ''} />
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{tp?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="text-sm font-semibold leading-tight">{tp?.full_name || 'Unknown'}</div>
                                        {tprof?.experience_years != null && (
                                          <div className="text-[11px] text-muted-foreground mt-0.5">{tprof.experience_years} yr exp</div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    <div className="space-y-1">
                                      {tp?.phone && (
                                        <a href={`tel:${tp.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3 text-muted-foreground" />{tp.phone}</a>
                                      )}
                                      {tp?.email && (
                                        <a href={`mailto:${tp.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary truncate max-w-[200px]" title={tp.email}><Mail className="h-3 w-3" /><span className="truncate">{tp.email}</span></a>
                                      )}
                                      {!tp?.phone && !tp?.email && <span className="text-muted-foreground">—</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs align-top max-w-[180px]">
                                    {edu ? (
                                      <div>
                                        <div className="font-semibold truncate" title={edu.degree}>{edu.degree}</div>
                                        <div className="text-muted-foreground truncate" title={edu.institution}>{edu.institution}</div>
                                        {edu.passing_year && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{edu.passing_year}</div>}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    {app.proposed_rate ? (
                                      <span className="text-sm font-semibold text-foreground">৳{app.proposed_rate}</span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-[220px] align-top">
                                    {bio && <p className="line-clamp-2 text-foreground/80" title={bio}>{bio}</p>}
                                    {app.cover_message && (
                                      <p className="line-clamp-2 mt-1 italic border-l-2 border-primary/30 pl-2" title={app.cover_message}>“{app.cover_message}”</p>
                                    )}
                                    {!bio && !app.cover_message && '—'}
                                  </TableCell>
                                  <TableCell className="align-top"><Badge className={`text-[10px] capitalize ${statusColor(app.status)}`}>{app.status}</Badge></TableCell>
                                  <TableCell className="align-top">
                                    <div className="space-y-1.5">
                                      {(() => {
                                        const vs = tprof?.verification_status || 'pending';
                                        const styles: Record<string, string> = {
                                          approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
                                          pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
                                          rejected: 'bg-destructive/10 text-destructive border-destructive/30',
                                        };
                                        const label = vs === 'approved' ? 'Verified' : vs === 'rejected' ? 'Rejected' : 'Pending';
                                        const Icon = vs === 'approved' ? ShieldCheck : vs === 'rejected' ? XCircle : Clock;
                                        return (
                                          <Badge className={`text-[10px] capitalize gap-1 border ${styles[vs] || styles.pending}`}>
                                            <Icon className="h-3 w-3" />{label}
                                          </Badge>
                                        );
                                      })()}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right align-top">
                                    <div className="flex gap-1 justify-end flex-wrap">
                                      {!isFinal && app.status === 'pending' && (
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdminUpdateAppStatus(app.id, 'shortlisted', app.job_id)} title="Shortlist">
                                          <CheckCircle2 className="h-3.5 w-3.5" /> Shortlist
                                        </Button>
                                      )}
                                      {!isFinal && (app.status === 'pending' || app.status === 'shortlisted') && (
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openDemoSchedule({ id: app.id, tutor_user_id: (app.tutor_profiles as any)?.user_id || '', tutor_id: (app.tutor_profiles as any)?.id || app.tutor_id, tutor_name: app.tutor_profile?.full_name || 'Tutor' }, app.job_id, (app.jobs as any)?.title || 'this job')} title="Schedule Demo Class">
                                          <Send className="h-3.5 w-3.5" /> Invite
                                        </Button>
                                      )}
                                      {!isFinal && (
                                        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdminUpdateAppStatus(app.id, 'accepted', app.job_id)} title="Hire / Accept">
                                          <CheckCircle2 className="h-3.5 w-3.5" /> Hire
                                        </Button>
                                      )}
                                      {!isFinal && (
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => handleAdminUpdateAppStatus(app.id, 'rejected', app.job_id)} title="Reject">
                                          <XCircle className="h-3.5 w-3.5" /> Reject
                                        </Button>
                                      )}
                                      {!isFinal && (
                                        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => handleAdminUpdateAppStatus(app.id, 'withdrawn', app.job_id)} title="Mark as Withdrawn">
                                          Withdraw
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" asChild title="View Tutor Profile" className="h-8 w-8 p-0">
                                        <Link to={`/tutor/${tprof?.id}`}><Eye className="h-4 w-4" /></Link>
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {visible.length > 0 && (() => {
                    const totalPages = Math.max(1, Math.ceil(visible.length / appsApplicantsPageSize));
                    const page = Math.min(appsApplicantsPage, totalPages);
                    const start = (page - 1) * appsApplicantsPageSize + 1;
                    const end = Math.min(page * appsApplicantsPageSize, visible.length);
                    return (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                        <div className="text-xs text-muted-foreground">Showing {start}–{end} of {visible.length}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={String(appsApplicantsPageSize)} onValueChange={(v) => { setAppsApplicantsPageSize(Number(v)); setAppsApplicantsPage(1); }}>
                            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setAppsApplicantsPage(1)}>« First</Button>
                          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setAppsApplicantsPage(page - 1)}>Prev</Button>
                          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setAppsApplicantsPage(page + 1)}>Next</Button>
                          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setAppsApplicantsPage(totalPages)}>Last »</Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}



            {activeTab === 'reports' && (() => {
              const q = reportsSearch.trim().toLowerCase();
              const filteredReports = !q ? reports : reports.filter(r =>
                (r.report_type || '').toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q) ||
                (r.status || '').toLowerCase().includes(q) ||
                (r.reported?.full_name || '').toLowerCase().includes(q) ||
                (r.reporter?.full_name || '').toLowerCase().includes(q)
              );
              return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h1 className="text-xl font-semibold">User Reports</h1>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={reportsSearch}
                      onChange={(e) => setReportsSearch(e.target.value)}
                      placeholder="Search type, description, status, or user"
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                {filteredReports.length === 0 ? (
                  <Card><CardContent className="py-16 text-center">
                    <Shield className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">{q ? 'No matches' : 'No reports'}</h3>
                    <p className="text-muted-foreground">{q ? 'Try a different search term.' : 'The community is safe!'}</p>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {filteredReports.map((report) => (
                      <Card key={report.id} className={report.status === 'pending' ? 'border-warning/30' : ''}>
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.status === 'pending' ? 'bg-destructive/10' : 'bg-muted'}`}>
                                <AlertTriangle className={`h-6 w-6 ${report.status === 'pending' ? 'text-destructive' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold capitalize">{report.report_type} Report</h4>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium">{report.reported?.full_name}</span> reported by {report.reporter?.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs capitalize ${statusColor(report.status)}`}>{report.status}</Badge>
                              {report.status === 'pending' && (
                                <Button variant="outline" size="sm" onClick={() => { setSelectedReport(report); setAdminNotes(''); }}>
                                  <Eye className="h-4 w-4 mr-1" /> Review
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              );
            })()}

            {/* Reviews tab removed */}

            {/* ═══════ PAYMENTS TAB ═══════ */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">Payment Transactions</h1>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
                          ) : payments.slice((paymentsPage - 1) * paymentsPageSize, paymentsPage * paymentsPageSize).map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.transaction_id}</TableCell>
                              <TableCell className="text-sm">{(p.profiles as any)?.full_name}</TableCell>
                              <TableCell className="text-sm font-semibold">৳{Number(p.amount).toLocaleString()}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs capitalize">{p.listing_type || 'subscription'}</Badge></TableCell>
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
                  const totalPages = Math.max(1, Math.ceil(payments.length / paymentsPageSize));
                  const page = Math.min(paymentsPage, totalPages);
                  const start = (page - 1) * paymentsPageSize + 1;
                  const end = Math.min(page * paymentsPageSize, payments.length);
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                      <div className="text-xs text-muted-foreground">Showing {start}–{end} of {payments.length}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={String(paymentsPageSize)} onValueChange={(v) => { setPaymentsPageSize(Number(v)); setPaymentsPage(1); }}>
                          <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPaymentsPage(1)}>« First</Button>
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPaymentsPage(page - 1)}>Prev</Button>
                        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPaymentsPage(page + 1)}>Next</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPaymentsPage(totalPages)}>Last »</Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══════ SUBSCRIPTIONS TAB ═══════ */}
            {activeTab === 'subscriptions' && <SubscriptionPlansTab toast={toast} />}

            {/* ═══════ DEMO REQUESTS TAB ═══════ */}
            {activeTab === 'demo_requests' && <DemoRequestsTab toast={toast} />}

            {/* ═══════ REVENUE & PAYOUTS TAB ═══════ */}
            {activeTab === 'revenue' && <RevenuePayoutTab toast={toast} />}

            {/* ═══════ SUPPORT TICKETS TAB ═══════ */}
            {activeTab === 'tickets' && <SupportTicketsTab toast={toast} />}

            {/* ═══════ GEOGRAPHIC ANALYTICS TAB ═══════ */}
            {activeTab === 'geographic' && <GeographicHeatmapTab toast={toast} />}

            {/* ═══════ REFERRAL ANALYTICS TAB ═══════ */}
            {activeTab === 'referrals' && <ReferralAnalyticsTab />}

            {/* ═══════ CONTACT MESSAGES TAB ═══════ */}
            {activeTab === 'contacts' && <ContactMessagesTab toast={toast} />}

            {/* ═══════ BROADCAST TAB ═══════ */}
            {activeTab === 'broadcast' && <BroadcastTab toast={toast} />}

            {/* ═══════ SUB-ADMIN RBAC TAB ═══════ */}
            {activeTab === 'rbac' && <SubAdminRBACTab toast={toast} />}

            {/* ═══════ CREATE USER TAB ═══════ */}
            {activeTab === 'create_user' && <AdminCreateUserTab toast={toast} />}

            {/* ═══════ POST JOB TAB ═══════ */}
            {activeTab === 'post_job' && <AdminPostJobTab toast={toast} />}

            {/* ═══════ TUTOR PROFILES TAB ═══════ */}
            {activeTab === 'tutor_profiles' && <AdminTutorProfilesTab toast={toast} onImpersonate={handleImpersonate} />}

            {/* ═══════ TUTOR EDITOR TAB ═══════ */}
            {activeTab === 'tutor_editor' && <AdminTutorEditTab toast={toast} />}

            {/* ═══════ PLATFORM DATA TAB ═══════ */}
            {activeTab === 'platform_data' && <PlatformDataTab toast={toast} />}

            {/* ═══════ SETTINGS TAB ═══════ */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">Platform Settings</h1>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Commission & Pricing</CardTitle>
                      <CardDescription>Platform fees are configured in Platform Data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Commission percentage, verification fee, and featured listing prices are managed centrally
                        under <strong>Platform Data → Pricing & Fees</strong>. They are read live by the demo booking,
                        boost, and verification flows.
                      </p>
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab('platform_data')}>
                        Open Platform Data
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Info</CardTitle>
                      <CardDescription>Current system status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Total Users', value: stats.totalUsers },
                        { label: 'Total Tutors', value: stats.totalTutors },
                        { label: 'Total Parents', value: stats.totalParents },
                        { label: 'Active Jobs', value: stats.activeJobs },
                        { label: 'Total Revenue', value: `৳${stats.totalRevenue.toLocaleString()}` },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ═══════ DIALOGS ═══════ */}

      {/* Review Tutor Dialog */}
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
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Uploaded Documents</label>
                {selectedTutor.verification_documents?.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedTutor.verification_documents.map((doc) => (
                      <a key={doc.id} href={doc.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm capitalize">{doc.document_type}</span>
                        <Badge variant="outline" className="ml-auto text-xs capitalize">{doc.status}</Badge>
                      </a>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground mt-1">No documents uploaded</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleVerifyTutor(selectedTutor!.id, 'rejected')} disabled={processing}>Reject</Button>
            <Button className="bg-success hover:bg-success/90" onClick={() => handleVerifyTutor(selectedTutor!.id, 'approved')} disabled={processing}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedUser?.is_banned ? 'Unban User' : 'Ban User'}</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">User</label>
                <p className="font-semibold">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              {!selectedUser.is_banned && (
                <div>
                  <label className="text-sm font-medium">Reason for ban</label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Why is this user being banned?" className="mt-1" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
            <Button variant={selectedUser?.is_banned ? 'default' : 'destructive'} onClick={() => handleBanUser(selectedUser!.id, !selectedUser!.is_banned)} disabled={processing}>
              {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Report</DialogTitle></DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-muted-foreground">Type</label><p className="capitalize">{selectedReport.report_type}</p></div>
                <div><label className="text-xs font-medium text-muted-foreground">Status</label><Badge className={`capitalize ${statusColor(selectedReport.status)}`}>{selectedReport.status}</Badge></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Reported User</label><p className="font-semibold">{selectedReport.reported?.full_name}</p><p className="text-sm text-muted-foreground">{selectedReport.reported?.email}</p></div>
              <div><label className="text-xs font-medium text-muted-foreground">Reporter</label><p>{selectedReport.reporter?.full_name}</p></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedReport.description}</p></div>
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes about this report..." className="mt-1" />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => handleResolveReport(selectedReport!.id, 'dismissed')} disabled={processing}>Dismiss</Button>
            <Button variant="destructive" onClick={() => handleResolveReport(selectedReport!.id, 'resolved', selectedReport!.reported_user_id)} disabled={processing}>
              <Ban className="h-4 w-4 mr-2" /> Ban & Resolve
            </Button>
            <Button onClick={() => handleResolveReport(selectedReport!.id, 'resolved')} disabled={processing}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={() => setEditingJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={editJobForm.title} onChange={(e) => setEditJobForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={editJobForm.description} onChange={(e) => setEditJobForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editJobForm.status} onValueChange={(v) => setEditJobForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Teaching Mode</label>
                <Select value={editJobForm.teaching_mode} onValueChange={(v) => setEditJobForm(f => ({ ...f, teaching_mode: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">District</label>
                <Select value={editJobForm.district_id} onValueChange={(v) => setEditJobForm(f => ({ ...f, district_id: v, area_id: '' }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {editJobDistricts.map(d => <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Area</label>
                <Select value={editJobForm.area_id} onValueChange={(v) => setEditJobForm(f => ({ ...f, area_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {editJobAreas.filter(a => a.district_id === editJobForm.district_id).map(a => <SelectItem key={a.id} value={a.id}>{a.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Select value={editJobForm.subject_id} onValueChange={(v) => setEditJobForm(f => ({ ...f, subject_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {editJobSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Class Level</label>
                <Input value={editJobForm.class_level} onChange={(e) => setEditJobForm(f => ({ ...f, class_level: e.target.value }))} className="mt-1" placeholder="e.g. Class 8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Budget Min (৳)</label>
                <Input type="number" value={editJobForm.budget_min} onChange={(e) => setEditJobForm(f => ({ ...f, budget_min: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Budget Max (৳)</label>
                <Input type="number" value={editJobForm.budget_max} onChange={(e) => setEditJobForm(f => ({ ...f, budget_max: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Days/Week</label>
                <Input type="number" value={editJobForm.days_per_week} onChange={(e) => setEditJobForm(f => ({ ...f, days_per_week: Number(e.target.value) }))} className="mt-1" min={1} max={7} />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (hrs)</label>
                <Input type="number" value={editJobForm.duration_hours} onChange={(e) => setEditJobForm(f => ({ ...f, duration_hours: Number(e.target.value) }))} className="mt-1" step={0.5} />
              </div>
              <div>
                <label className="text-sm font-medium">Students</label>
                <Input type="number" value={editJobForm.number_of_students} onChange={(e) => setEditJobForm(f => ({ ...f, number_of_students: Number(e.target.value) }))} className="mt-1" min={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Preferred Time</label>
                <Select value={editJobForm.preferred_time} onValueChange={(v) => setEditJobForm(f => ({ ...f, preferred_time: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select preferred time" /></SelectTrigger>
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
              <div>
                <label className="text-sm font-medium">Fixed Time (Optional)</label>
                <Input type="time" value={editJobForm.fixed_time} onChange={(e) => setEditJobForm(f => ({ ...f, fixed_time: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={editJobForm.start_date} onChange={(e) => setEditJobForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Preferred Tutor Gender</label>
                <Select value={editJobForm.preferred_tutor_gender} onValueChange={(v) => setEditJobForm(f => ({ ...f, preferred_tutor_gender: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Student Gender</label>
                <Select value={editJobForm.student_gender || 'any'} onValueChange={(v) => setEditJobForm(f => ({ ...f, student_gender: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Student Age</label>
              <Input value={editJobForm.student_age} onChange={(e) => setEditJobForm(f => ({ ...f, student_age: e.target.value }))} className="mt-1" placeholder="e.g. 12" />
            </div>
            <div>
              <label className="text-sm font-medium">Location Details</label>
              <Textarea value={editJobForm.location_details} onChange={(e) => setEditJobForm(f => ({ ...f, location_details: e.target.value }))} className="mt-1" rows={2} placeholder="Specific address or directions" />
            </div>
            <div>
              <label className="text-sm font-medium">Special Requirements</label>
              <Textarea value={editJobForm.special_requirements} onChange={(e) => setEditJobForm(f => ({ ...f, special_requirements: e.target.value }))} className="mt-1" rows={2} placeholder="Any special needs or requirements" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJob(null)}>Cancel</Button>
            <Button onClick={handleSaveJob} disabled={processing}>{processing ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Applications & Assign Tutor Dialog */}
      <Dialog open={!!viewingJobApps} onOpenChange={() => { setViewingJobApps(null); setAssignTutorSearch(''); setAssignTutorResults([]); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Applications for "{viewingJobApps?.jobTitle}"
            </DialogTitle>
          </DialogHeader>

          {/* Assign Tutor Section */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Assign Tutor Manually</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, or tutor ID (e.g. TT-00001)..."
                value={assignTutorSearch}
                onChange={(e) => handleSearchTutors(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchingTutors && <p className="text-xs text-muted-foreground">Searching tutors...</p>}
            {assignTutorResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignTutorResults.map((t) => (
                  <div key={t.tutor_id} className="flex items-center justify-between p-3 rounded-md border bg-background gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{t.name}</span>
                        {t.reference && <Badge variant="outline" className="text-[10px] font-mono">{t.reference}</Badge>}
                        {t.verification === 'approved' && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">Verified</Badge>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {t.phone && <span className="text-xs text-muted-foreground">{t.phone}</span>}
                        {t.phone && t.email && <span className="text-xs text-muted-foreground">·</span>}
                        <span className="text-xs text-muted-foreground truncate">{t.email}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="secondary" className="text-[10px] capitalize">{t.gender}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{t.experience} yrs</Badge>
                        {t.rating && <Badge variant="secondary" className="text-[10px]">★ {t.rating}</Badge>}
                        {t.district && <Badge variant="outline" className="text-[10px]">{t.district}</Badge>}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAssignTutor(t.tutor_id, t.user_id, t.name)} disabled={processing} className="shrink-0">
                      <Plus className="h-3 w-3 mr-1" /> Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {assignTutorSearch.length >= 2 && !searchingTutors && assignTutorResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No tutors found. Try a different search term.</p>
            )}
          </div>

          {/* Applications List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Applications ({jobApplications.length})</h3>
            {loadingApps ? (
              <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
            ) : jobApplications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No applications yet. Use the search above to assign a tutor.</div>
            ) : (
              jobApplications.map((app) => (
                <div key={app.id} className={`border rounded-lg p-4 space-y-3 ${app.status === 'shortlisted' ? 'border-primary/50 bg-primary/5' : app.status === 'rejected' ? 'border-destructive/30 bg-destructive/5' : app.status === 'waiting' ? 'border-warning/30 bg-warning/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{app.tutor_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{app.tutor_name}</p>
                        <p className="text-xs text-muted-foreground">{app.tutor_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs capitalize ${statusColor(app.status)}`}>{app.status}</Badge>
                      <Button variant="outline" size="sm" className="text-xs" asChild>
                        <Link to={`/tutor/${app.tutor_user_id}`} target="_blank">
                          <Eye className="h-3 w-3 mr-1" /> Full Profile
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{app.tutor_gender}</Badge>
                    <Badge variant="outline" className="text-xs">{app.tutor_experience} yrs exp</Badge>
                    <Badge variant="outline" className={`text-xs capitalize ${app.tutor_verification === 'approved' ? 'border-success text-success' : ''}`}>
                      {app.tutor_verification}
                    </Badge>
                    {app.proposed_rate && <Badge variant="secondary" className="text-xs">৳{app.proposed_rate}/month</Badge>}
                  </div>
                  {app.cover_message && (
                    <p className="text-sm bg-muted/50 p-2 rounded text-muted-foreground">{app.cover_message}</p>
                  )}
                  <div className="text-xs text-muted-foreground">Applied {formatExactDate(new Date(app.created_at))}</div>
                  
                  {/* Action Buttons based on status */}
                  {app.status === 'pending' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => handleAdminUpdateAppStatus(app.id, 'shortlisted' as any, viewingJobApps!.jobId)} disabled={processing}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Shortlist
                      </Button>
                      <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10" onClick={() => handleAdminUpdateAppStatus(app.id, 'waiting' as any, viewingJobApps!.jobId)} disabled={processing}>
                        <Clock className="h-3.5 w-3.5 mr-1" /> Waiting
                      </Button>
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleAdminUpdateAppStatus(app.id, 'accepted', viewingJobApps!.jobId)} disabled={processing}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAdminUpdateAppStatus(app.id, 'rejected', viewingJobApps!.jobId)} disabled={processing}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {app.status === 'shortlisted' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleAdminUpdateAppStatus(app.id, 'accepted', viewingJobApps!.jobId)} disabled={processing}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10" onClick={() => handleAdminUpdateAppStatus(app.id, 'waiting' as any, viewingJobApps!.jobId)} disabled={processing}>
                        <Clock className="h-3.5 w-3.5 mr-1" /> Waiting
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAdminUpdateAppStatus(app.id, 'rejected', viewingJobApps!.jobId)} disabled={processing}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleAdminUpdateAppStatus(app.id, 'pending', viewingJobApps!.jobId)} disabled={processing}>
                        Undo
                      </Button>
                    </div>
                  )}
                  {app.status === 'waiting' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => handleAdminUpdateAppStatus(app.id, 'shortlisted' as any, viewingJobApps!.jobId)} disabled={processing}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Shortlist
                      </Button>
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleAdminUpdateAppStatus(app.id, 'accepted', viewingJobApps!.jobId)} disabled={processing}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAdminUpdateAppStatus(app.id, 'rejected', viewingJobApps!.jobId)} disabled={processing}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleAdminUpdateAppStatus(app.id, 'pending', viewingJobApps!.jobId)} disabled={processing}>
                        Undo
                      </Button>
                    </div>
                  )}
                  {app.status === 'rejected' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAdminUpdateAppStatus(app.id, 'pending', viewingJobApps!.jobId)} disabled={processing}>
                        Undo Rejection
                      </Button>
                    </div>
                  )}
                  {app.status === 'accepted' && (
                    <p className="text-xs text-success font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Assigned to this job</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin direct demo schedule dialog */}
      <Dialog open={!!demoScheduleApp} onOpenChange={(o) => !o && setDemoScheduleApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Demo Class</DialogTitle>
          </DialogHeader>
          {demoScheduleApp && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Inviting <span className="font-medium text-foreground">{demoScheduleApp.tutorName}</span> for
                <span className="font-medium text-foreground"> "{demoScheduleApp.jobTitle}"</span>. The tutor will be notified immediately (admin-direct, no further approval needed).
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Date *</label>
                  <Input type="date" value={demoScheduleDate} min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} onChange={(e) => setDemoScheduleDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Time *</label>
                  <Input type="time" value={demoScheduleTime} onChange={(e) => setDemoScheduleTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Duration</label>
                <Select value={demoScheduleDuration} onValueChange={setDemoScheduleDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Class Fee (৳) — leave 0 for free demo</label>
                <Input type="number" min={0} step={10} value={demoScheduleFee} onChange={(e) => setDemoScheduleFee(e.target.value)} />
                {Number(demoScheduleFee) > 0 && (() => {
                  const s = computeFeeSplit(Number(demoScheduleFee), demoScheduleCommissionPct);
                  return (
                    <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs space-y-1">
                      <div className="font-medium text-foreground">Split ({s.commissionPct}% commission)</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Platform commission</span><span>৳{s.platformCommission}</span></div>
                      <div className="flex justify-between font-semibold"><span>Tutor payout</span><span>৳{s.tutorPayout}</span></div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Notes (optional)</label>
                <Textarea rows={2} maxLength={500} placeholder="Any specific topics, link, or instructions..." value={demoScheduleNotes} onChange={(e) => setDemoScheduleNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemoScheduleApp(null)} disabled={demoScheduling}>Cancel</Button>
            <Button onClick={handleAdminScheduleDemo} disabled={demoScheduling || !demoScheduleDate || !demoScheduleTime}>
              {demoScheduling ? 'Scheduling...' : 'Schedule & Notify Tutor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
