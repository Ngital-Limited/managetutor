import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/lib/adminLogger';
import { Plus, Pencil, Trash2, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  page_type: string;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
}

const PAGE_TYPES = [
  { value: 'faq', label: 'FAQ' },
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'about', label: 'About Us' },
  { value: 'custom', label: 'Custom Page' },
];

export function AdminCMSTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { user } = useAuth();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CMSPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewPage, setPreviewPage] = useState<CMSPage | null>(null);

  const [form, setForm] = useState({
    slug: '',
    title: '',
    content: '',
    page_type: 'custom',
    is_published: true,
    sort_order: 0,
  });

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cms_pages')
      .select('*')
      .order('sort_order', { ascending: true });
    setPages((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const resetForm = () => {
    setForm({ slug: '', title: '', content: '', page_type: 'custom', is_published: true, sort_order: pages.length });
  };

  const openCreate = () => {
    resetForm();
    setForm(f => ({ ...f, sort_order: pages.length }));
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (page: CMSPage) => {
    setForm({
      slug: page.slug,
      title: page.title,
      content: page.content,
      page_type: page.page_type,
      is_published: page.is_published,
      sort_order: page.sort_order,
    });
    setEditing(page);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast({ title: 'Missing fields', description: 'Title and slug are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('cms_pages')
          .update({
            slug: form.slug.trim(),
            title: form.title.trim(),
            content: form.content,
            page_type: form.page_type,
            is_published: form.is_published,
            sort_order: form.sort_order,
          })
          .eq('id', editing.id);
        if (error) throw error;
        await logAdminAction('cms_page_updated', `Updated CMS page: ${form.title}`, editing.id);
        toast({ title: 'Page updated' });
      } else {
        const { error } = await supabase
          .from('cms_pages')
          .insert({
            slug: form.slug.trim(),
            title: form.title.trim(),
            content: form.content,
            page_type: form.page_type,
            is_published: form.is_published,
            sort_order: form.sort_order,
          });
        if (error) throw error;
        await logAdminAction('cms_page_created', `Created CMS page: ${form.title}`);
        toast({ title: 'Page created' });
      }
      setEditing(null);
      setCreating(false);
      fetchPages();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (page: CMSPage) => {
    if (!confirm(`Delete "${page.title}"?`)) return;
    const { error } = await supabase.from('cms_pages').delete().eq('id', page.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await logAdminAction('cms_page_deleted', `Deleted CMS page: ${page.title}`, page.id);
    toast({ title: 'Page deleted' });
    fetchPages();
  };

  const togglePublish = async (page: CMSPage) => {
    const { error } = await supabase
      .from('cms_pages')
      .update({ is_published: !page.is_published })
      .eq('id', page.id);
    if (!error) {
      await logAdminAction('cms_page_toggled', `${page.is_published ? 'Unpublished' : 'Published'} CMS page: ${page.title}`, page.id);
      fetchPages();
    }
  };

  const autoSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s]+/g, '-').replace(/-+/g, '-').trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Content Management</h1>
          <p className="text-sm text-muted-foreground">Manage FAQ, Terms, Privacy and custom pages</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Page
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : pages.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pages yet. Create your first page.</TableCell></TableRow>
              ) : pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{page.page_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">/{page.slug}</TableCell>
                  <TableCell>
                    <Badge variant={page.is_published ? 'default' : 'secondary'} className="text-xs">
                      {page.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(page.updated_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setPreviewPage(page)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(page)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => togglePublish(page)}>
                        {page.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(page)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Page' : 'Create Page'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm(f => ({ ...f, title, slug: creating ? autoSlug(title) : f.slug }));
                  }}
                  placeholder="Page title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL Slug *</label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="page-slug"
                  className="mt-1 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Page Type</label>
                <Select value={form.page_type} onValueChange={(v) => setForm(f => ({ ...f, page_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm(f => ({ ...f, is_published: v }))} />
                <span className="text-sm">{form.is_published ? 'Published' : 'Draft'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Content (Markdown / HTML)</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your page content here. Supports Markdown and HTML..."
                className="mt-1 font-mono text-sm min-h-[300px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Page' : 'Create Page'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={() => setPreviewPage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {previewPage?.title}
            </DialogTitle>
          </DialogHeader>
          {previewPage && (
            <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewPage.content }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
