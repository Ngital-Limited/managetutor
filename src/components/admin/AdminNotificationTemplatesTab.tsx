import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/lib/adminLogger';
import { Plus, Pencil, Eye, Bell, Mail, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface NotifTemplate {
  id: string;
  template_key: string;
  title_template: string;
  message_template: string;
  channel: string;
  is_active: boolean;
  description: string | null;
  updated_at: string;
}

const DEFAULT_TEMPLATES = [
  { key: 'new_job', title: 'New Tuition Job Available', message: 'A new job "{{job_title}}" has been posted in {{district}}.', channel: 'in_app', desc: 'Sent to tutors when a matching job is posted' },
  { key: 'application_received', title: 'New Application Received', message: 'A tutor ({{tutor_name}}) applied to your job: {{job_title}}', channel: 'in_app', desc: 'Sent to parents when a tutor applies' },
  { key: 'application_accepted', title: 'Congratulations! You have been selected', message: 'For the job: {{job_title}}', channel: 'in_app', desc: 'Sent to tutors when accepted' },
  { key: 'application_rejected', title: 'Your application was not selected', message: 'For the job: {{job_title}}', channel: 'in_app', desc: 'Sent to tutors when rejected' },
  { key: 'demo_approved', title: 'Demo Class Scheduled', message: 'Your demo class on {{schedule}} has been approved.', channel: 'in_app', desc: 'Sent when admin approves demo' },
  { key: 'commission_reminder', title: 'Commission Payment Due', message: 'You have a pending commission of ৳{{amount}} for {{job_title}}.', channel: 'in_app', desc: 'Sent for overdue commissions' },
  { key: 'verification_approved', title: 'Profile Verified!', message: 'Your tutor profile has been verified. You can now apply to jobs.', channel: 'in_app', desc: 'Sent when tutor is verified' },
  { key: 'broadcast', title: '{{title}}', message: '{{message}}', channel: 'in_app', desc: 'Admin broadcast notifications' },
];

export function AdminNotificationTemplatesTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<NotifTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotifTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<NotifTemplate | null>(null);

  const [form, setForm] = useState({
    template_key: '',
    title_template: '',
    message_template: '',
    channel: 'in_app',
    is_active: true,
    description: '',
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .order('template_key', { ascending: true });
    setTemplates((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const seedDefaults = async () => {
    const existing = templates.map(t => t.template_key);
    const toInsert = DEFAULT_TEMPLATES.filter(d => !existing.includes(d.key)).map(d => ({
      template_key: d.key,
      title_template: d.title,
      message_template: d.message,
      channel: d.channel,
      is_active: true,
      description: d.desc,
    }));
    if (toInsert.length === 0) {
      toast({ title: 'All defaults exist', description: 'No new templates to seed.' });
      return;
    }
    const { error } = await supabase.from('notification_templates').insert(toInsert);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${toInsert.length} templates seeded` });
    fetchTemplates();
  };

  const openEdit = (tmpl: NotifTemplate) => {
    setForm({
      template_key: tmpl.template_key,
      title_template: tmpl.title_template,
      message_template: tmpl.message_template,
      channel: tmpl.channel,
      is_active: tmpl.is_active,
      description: tmpl.description || '',
    });
    setEditing(tmpl);
  };

  const handleSave = async () => {
    if (!form.template_key.trim() || !form.title_template.trim()) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          title_template: form.title_template,
          message_template: form.message_template,
          channel: form.channel,
          is_active: form.is_active,
          description: form.description || null,
        })
        .eq('id', editing!.id);
      if (error) throw error;
      await logAdminAction('template_updated', `Updated notification template: ${form.template_key}`, editing!.id);
      toast({ title: 'Template updated' });
      setEditing(null);
      fetchTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tmpl: NotifTemplate) => {
    await supabase.from('notification_templates').update({ is_active: !tmpl.is_active }).eq('id', tmpl.id);
    fetchTemplates();
  };

  const previewWithSample = (tmpl: NotifTemplate) => {
    const sampleData: Record<string, string> = {
      '{{job_title}}': 'Home Tutor for Class 8 Math',
      '{{district}}': 'Dhaka',
      '{{tutor_name}}': 'Md. Karim',
      '{{schedule}}': '15 May 2026 at 4:00 PM',
      '{{amount}}': '3,000',
      '{{title}}': 'Platform Update',
      '{{message}}': 'We have exciting new features!',
    };
    const rendered: NotifTemplate = {
      ...tmpl,
      title_template: Object.entries(sampleData).reduce((s, [k, v]) => s.replace(k, v), tmpl.title_template),
      message_template: Object.entries(sampleData).reduce((s, [k, v]) => s.replace(k, v), tmpl.message_template),
    };
    setPreviewTemplate(rendered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Notification Templates</h1>
          <p className="text-sm text-muted-foreground">Customize in-app notification messages. Use {'{{variable}}'} placeholders.</p>
        </div>
        <Button variant="outline" onClick={seedDefaults}>
          <Copy className="h-4 w-4 mr-2" /> Seed Defaults
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{templates.length}</p>
            <p className="text-xs text-muted-foreground">Total Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{templates.filter(t => t.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{templates.filter(t => !t.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{new Set(templates.map(t => t.channel)).size}</p>
            <p className="text-xs text-muted-foreground">Channels</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Title Template</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No templates. Click "Seed Defaults" to get started.</TableCell></TableRow>
              ) : templates.map((tmpl) => (
                <TableRow key={tmpl.id}>
                  <TableCell className="font-mono text-xs">{tmpl.template_key}</TableCell>
                  <TableCell className="text-sm max-w-[250px] truncate">{tmpl.title_template}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {tmpl.channel === 'in_app' ? <Bell className="h-3 w-3 mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                      {tmpl.channel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tmpl.is_active ? 'default' : 'secondary'} className="text-xs">
                      {tmpl.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => previewWithSample(tmpl)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(tmpl)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(tmpl)}>
                        {tmpl.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template: {form.template_key}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" placeholder="What this template is for" />
            </div>
            <div>
              <label className="text-sm font-medium">Title Template</label>
              <Input value={form.title_template} onChange={(e) => setForm(f => ({ ...f, title_template: e.target.value }))} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Use {'{{variable}}'} for dynamic values</p>
            </div>
            <div>
              <label className="text-sm font-medium">Message Template</label>
              <Textarea value={form.message_template} onChange={(e) => setForm(f => ({ ...f, message_template: e.target.value }))} className="mt-1" rows={4} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <span className="text-sm">{form.is_active ? 'Active' : 'Disabled'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Notification Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{previewTemplate.title_template}</p>
                  <p className="text-sm text-muted-foreground mt-1">{previewTemplate.message_template}</p>
                  <p className="text-xs text-muted-foreground mt-2">Just now</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
