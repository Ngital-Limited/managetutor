import { useState, useEffect, useCallback } from 'react';
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
import { NotificationBell } from '@/components/NotificationBell';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/components/ui/sidebar';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  GraduationCap, Shield, Users, Briefcase, CheckCircle2, XCircle,
  Clock, AlertTriangle, BarChart3, FileText, Settings, Search,
  Eye, Ban, UserCheck, FileCheck,
  LogOut, Home, Star, DollarSign, Trash2, CreditCard, Megaphone, Send, Mail,
  Package, Plus, Pencil, ToggleLeft, ToggleRight, Wallet, MapPin, LifeBuoy, ShieldCheck,
  LogIn, BookOpen, UserPlus
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
  totalReviews: number;
  totalRevenue: number;
  pendingJobs: number;
  pendingUsers: number;
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

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  parent: { full_name: string };
  tutor_profiles: { profiles: { full_name: string } };
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
  name: string; name_bn: string; description: string;
  price_monthly: number; price_quarterly: number; price_yearly: number;
  max_applications_per_month: number; featured_profile: boolean; priority_support: boolean;
  is_active: boolean;
}
const emptyPlan: PlanForm = {
  name: '', name_bn: '', description: '',
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
      <div className="flex items-center justify-between">
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
                  <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</TableCell>
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
        const { data: tp } = await supabase
          .from('tutor_profiles')
          .select('user_id')
          .eq('id', request.tutor_profiles?.id)
          .single();
        if (tp) {
          await supabase.from('notifications').insert({
            user_id: tp.user_id,
            title: 'New Demo Class Request',
            message: 'A parent has requested a demo class with you. Check your dashboard for details.',
            type: 'demo_approved',
            reference_id: id,
          });
        }
        await supabase.from('notifications').insert({
          user_id: request.parent_id,
          title: 'Demo Class Approved',
          message: 'Your demo class request has been approved! The tutor has been notified.',
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
      <div className="flex items-center justify-between">
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
      name: plan.name || '', name_bn: plan.name_bn || '', description: plan.description || '',
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
          name: form.name, name_bn: form.name_bn || null, description: form.description || null,
          price_monthly: form.price_monthly, price_quarterly: form.price_quarterly || null, price_yearly: form.price_yearly || null,
          max_applications_per_month: form.max_applications_per_month || null,
          featured_profile: form.featured_profile, priority_support: form.priority_support, is_active: form.is_active,
        }).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Plan updated' });
      } else {
        const { error } = await supabase.from('subscription_plans').insert({
          name: form.name, name_bn: form.name_bn || null, description: form.description || null,
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
      <div className="flex items-center justify-between">
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
                    {plan.name_bn && <p className="text-sm text-muted-foreground">{plan.name_bn}</p>}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Plan Name *</label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Name (Bangla)</label>
                <Input value={form.name_bn} onChange={e => set('name_bn', e.target.value)} placeholder="বাংলা নাম" className="mt-1" />
              </div>
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
    pendingReports: 0, totalReviews: 0, totalRevenue: 0, pendingJobs: 0, pendingUsers: 0,
  });

  // Data states
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [pendingTutors, setPendingTutors] = useState<TutorVerification[]>([]);
  const [verificationFilter, setVerificationFilter] = useState('pending');
  const [verificationPayments, setVerificationPayments] = useState<PaymentRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
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
    preferred_time: '', preferred_tutor_gender: 'any', student_gender: '',
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
          .select('id, user_id, gender, experience_years, average_rating, verification_status, district_id')
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
              rating: t.average_rating,
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
      { count: totalReviews },
      { count: pendingJobs },
      { count: pendingUsers },
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
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval' as any),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    ]);

    const { data: rev } = await supabase.from('payment_transactions').select('amount').eq('status', 'completed');
    const totalRevenue = rev?.reduce((s, r) => s + Number(r.amount), 0) || 0;

    setStats({
      totalUsers: totalUsers || 0, totalTutors: totalTutors || 0, totalParents: totalParents || 0,
      pendingVerifications: pendingVerifications || 0, activeJobs: activeJobs || 0,
      totalJobs: totalJobs || 0, completedJobs: completedJobs || 0, acceptedJobs: acceptedJobs || 0,
      pendingReports: pendingReports || 0, totalReviews: totalReviews || 0, totalRevenue,
      pendingJobs: pendingJobs || 0, pendingUsers: pendingUsers || 0,
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
    let query = supabase.from('profiles').select('id, full_name, email, phone, avatar_url, is_banned, is_approved, created_at').order('created_at', { ascending: false }).limit(100);
    if (userSearch) query = query.or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%,phone.ilike.%${userSearch}%`);
    const { data } = await query;
    if (!data) { setUsers([]); return; }

    // Fetch roles for these users
    const ids = data.map(u => u.id);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', ids);
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    let result = data.map(u => ({ ...u, role: roleMap.get(u.id) || 'unknown' })) as UserRow[];
    if (userRoleFilter !== 'all') result = result.filter(u => u.role === userRoleFilter);
    setUsers(result);
  }, [userSearch, userRoleFilter]);

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
      .limit(50);
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
      .order('created_at', { ascending: false }).limit(100);
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

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, is_approved, created_at, parent_id, tutor_id')
      .order('created_at', { ascending: false }).limit(50);
    if (data) {
      const parentIds = [...new Set(data.map(r => r.parent_id))];
      const tutorIds = [...new Set(data.map(r => r.tutor_id))];
      const [{ data: parentProfs }, { data: tutorData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', parentIds),
        supabase.from('tutor_profiles').select('id, user_id').in('id', tutorIds),
      ]);
      const parentMap = new Map(parentProfs?.map(p => [p.id, p]) || []);
      const tutorUserIds = [...new Set(tutorData?.map(t => t.user_id) || [])];
      const { data: tutorProfs } = await supabase.from('profiles').select('id, full_name').in('id', tutorUserIds);
      const tutorProfMap = new Map(tutorProfs?.map(p => [p.id, p]) || []);
      const tutorMap = new Map(tutorData?.map(t => [t.id, tutorProfMap.get(t.user_id)]) || []);
      
      setReviews(data.map(r => ({
        ...r,
        parent: parentMap.get(r.parent_id) || { full_name: 'Unknown' },
        tutor_profiles: { profiles: tutorMap.get(r.tutor_id) || { full_name: 'Unknown' } },
      })) as unknown as ReviewRow[]);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from('payment_transactions')
      .select('id, amount, currency, status, transaction_id, created_at, completed_at, listing_type, user_id')
      .order('created_at', { ascending: false }).limit(50);
    if (data) {
      const uids = [...new Set(data.map(p => p.user_id))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', uids);
      const pMap = new Map(profs?.map(p => [p.id, p]) || []);
      setPayments(data.map(p => ({ ...p, profiles: pMap.get(p.user_id) || { full_name: 'Unknown', email: '' } })) as unknown as PaymentRow[]);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (role !== 'admin') return;
    switch (activeTab) {
      case 'users': fetchUsers(); break;
      case 'verifications': fetchVerifications(); break;
      case 'jobs': fetchJobs(); break;
      case 'reports': fetchReports(); break;
      case 'reviews': fetchReviews(); break;
      case 'payments': fetchPayments(); break;
    }
  }, [activeTab, role, fetchUsers, fetchVerifications, fetchJobs, fetchReports, fetchReviews, fetchPayments]);

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

  const handleToggleReview = async (reviewId: string, approved: boolean) => {
    const { error } = await supabase.from('reviews').update({ is_approved: approved }).eq('id', reviewId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Review ${approved ? 'approved' : 'hidden'}` }); fetchReviews(); }
  };

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

  if (loading || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sidebarItems = [
    { title: 'Overview', value: 'overview', icon: BarChart3 },
    { title: 'Create User', value: 'create_user', icon: UserPlus },
    { title: 'Post Job', value: 'post_job', icon: Briefcase },
    { title: 'Tutor Profiles', value: 'tutor_profiles', icon: GraduationCap },
    { title: 'Tutor Editor', value: 'tutor_editor', icon: Pencil },
    { title: 'Guardians / Parents', value: 'guardians', icon: Users },
    { title: 'Verifications', value: 'verifications', icon: UserCheck, badge: stats.pendingVerifications },
    { title: 'Jobs', value: 'jobs', icon: Briefcase },
    { title: 'Reports', value: 'reports', icon: AlertTriangle, badge: stats.pendingReports },
    { title: 'Reviews', value: 'reviews', icon: Star },
    { title: 'Payments', value: 'payments', icon: CreditCard },
    { title: 'Subscriptions', value: 'subscriptions', icon: Package },
    { title: 'Demo Requests', value: 'demo_requests', icon: GraduationCap },
    { title: 'Revenue & Payouts', value: 'revenue', icon: Wallet },
    { title: 'Support Tickets', value: 'tickets', icon: LifeBuoy },
    { title: 'Geographic Analytics', value: 'geographic', icon: MapPin },
    { title: 'Contact Messages', value: 'contacts', icon: Mail },
    { title: 'Broadcast', value: 'broadcast', icon: Megaphone },
    { title: 'Sub-Admin Roles', value: 'rbac', icon: ShieldCheck },
    { title: 'Platform Data', value: 'platform_data', icon: BookOpen },
    { title: 'Settings', value: 'settings', icon: Settings },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': case 'active': case 'approved': case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'pending': case 'pending_approval': return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected': case 'cancelled': case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <Sidebar collapsible="none" className="border-r border-border/50">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.value)}
                        className={`w-full justify-start text-sm ${activeTab === item.value ? 'bg-primary/8 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                        <span className="flex-1 text-left truncate">{item.title}</span>
                        {item.badge ? (
                          <span className="ml-auto text-[10px] font-medium bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">{item.badge}</span>
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
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
                <h1 className="text-xl font-semibold">User Management</h1>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, email, or phone..." className="pl-10" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchUsers()} />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="parent">Parents</SelectItem>
                      <SelectItem value="tutor">Tutors</SelectItem>
                      <SelectItem value="agency">Agencies</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchUsers}><Search className="h-4 w-4 mr-1" /> Search</Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Search users to see results</TableCell></TableRow>
                          ) : users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.avatar_url || ''} />
                                    <AvatarFallback className="text-xs">{u.full_name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-sm">{u.full_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{u.phone || '—'}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize text-xs">{u.role}</Badge></TableCell>
                              <TableCell>
                                {u.is_banned ? (
                                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                                ) : !u.is_approved ? (
                                  <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pending Approval</Badge>
                                ) : (
                                  <Badge className="bg-success/10 text-success border-success/20 text-xs">Approved</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  {(u.role === 'tutor' || u.role === 'parent') && (
                                    <Button variant="ghost" size="sm" onClick={() => handleImpersonate(u.id)} title={`Login as ${u.full_name}`}>
                                      <LogIn className="h-4 w-4 text-primary" />
                                    </Button>
                                  )}
                                   {u.role === 'tutor' && (
                                    <>
                                      <Button variant="ghost" size="sm" asChild><Link to={`/tutor/${u.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                      <Button variant="ghost" size="sm" asChild title="Edit Tutor Profile"><Link to={`/admin/tutor/${u.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                                    </>
                                   )}
                                   {u.role === 'parent' && (
                                    <Button variant="ghost" size="sm" asChild title="Edit Parent Profile"><Link to={`/admin/parent/${u.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                                   )}
                                   {!u.is_approved && (
                                    <Button variant="ghost" size="sm" onClick={() => handleApproveUser(u.id)} title="Approve User">
                                      <UserCheck className="h-4 w-4 text-success" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setAdminNotes(''); }}>
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
              </div>
            )}

            {/* ═══════ VERIFICATIONS TAB ═══════ */}
            {activeTab === 'verifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
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
                    <CardDescription>Payment history for ৳50 verified badge purchases</CardDescription>
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
                          ) : verificationPayments.map((p) => (
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
              </div>
            )}

            {/* ═══════ JOBS TAB ═══════ */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold">Job Management</h1>
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
                          {jobs.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
                          ) : jobs.map((job) => (
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
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</TableCell>
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
              </div>
            )}

            {/* ═══════ REPORTS TAB ═══════ */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">User Reports</h1>
                {reports.length === 0 ? (
                  <Card><CardContent className="py-16 text-center">
                    <Shield className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="font-bold mb-2">No reports</h3>
                    <p className="text-muted-foreground">The community is safe!</p>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
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
            )}

            {/* ═══════ REVIEWS TAB ═══════ */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <h1 className="text-xl font-semibold">Review Moderation</h1>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parent</TableHead>
                            <TableHead>Tutor</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reviews.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reviews yet</TableCell></TableRow>
                          ) : reviews.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm">{(r.parent as any)?.full_name}</TableCell>
                              <TableCell className="text-sm">{(r.tutor_profiles as any)?.profiles?.full_name || '—'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                                  <span className="text-sm font-medium">{r.rating}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm max-w-[250px] truncate">{r.comment || '—'}</TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${r.is_approved ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                  {r.is_approved ? 'Visible' : 'Hidden'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleToggleReview(r.id, !r.is_approved)}>
                                  {r.is_approved ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

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
                          ) : payments.map((p) => (
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
                      <CardDescription>Configure platform fees</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Commission Rate (%)</label>
                        <Input type="number" defaultValue="10" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Featured Tutor Daily Rate (৳)</label>
                        <Input type="number" defaultValue="50" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Featured Job Daily Rate (৳)</label>
                        <Input type="number" defaultValue="30" className="mt-1" />
                      </div>
                      <Button className="w-full">Save Settings</Button>
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
                <Input value={editJobForm.preferred_time} onChange={(e) => setEditJobForm(f => ({ ...f, preferred_time: e.target.value }))} className="mt-1" placeholder="e.g. Evening 5-7 PM" />
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
                  <div className="text-xs text-muted-foreground">Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</div>
                  
                  {/* Action Buttons based on status */}
                  {app.status === 'pending' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => handleAdminUpdateAppStatus(app.id, 'shortlisted' as any, viewingJobApps!.jobId)} disabled={processing}>
                        <Star className="h-3.5 w-3.5 mr-1" /> Shortlist
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
                        <Star className="h-3.5 w-3.5 mr-1" /> Shortlist
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
    </SidebarProvider>
  );
}
