import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, ExternalLink } from 'lucide-react';

interface AdRow {
  id: string;
  slot: string;
  ad_type: 'image' | 'gif' | 'html';
  image_url: string | null;
  link_url: string | null;
  html_content: string | null;
  is_active: boolean;
  width: number;
  height: number;
  created_at: string;
}

const SLOT_OPTIONS = [
  { value: 'job_details_sidebar', label: 'Job Details — Sidebar (300x250)' },
  { value: 'find_tutors_sidebar', label: 'Find Tutors — Sidebar (300x250)' },
  { value: 'browse_jobs_sidebar', label: 'Browse Jobs — Sidebar (300x250)' },
  { value: 'home_banner', label: 'Home — Banner' },
];

export function AdsManagementTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [slot, setSlot] = useState('job_details_sidebar');
  const [adType, setAdType] = useState<'image' | 'gif' | 'html'>('image');
  const [linkUrl, setLinkUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(250);
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ad_placements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load ads', description: error.message, variant: 'destructive' });
    setAds((data || []) as AdRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setLinkUrl(''); setHtmlContent(''); setFile(null);
    setWidth(300); setHeight(250); setAdType('image');
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      let imageUrl: string | null = null;

      if (adType !== 'html') {
        if (!file) {
          toast({ title: 'Please select an image or GIF file', variant: 'destructive' });
          setSaving(false); return;
        }
        const ext = file.name.split('.').pop();
        const path = `${slot}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('ads').upload(path, file, {
          cacheControl: '3600', upsert: false, contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('ads').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      } else {
        if (!htmlContent.trim()) {
          toast({ title: 'HTML content required', variant: 'destructive' });
          setSaving(false); return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('ad_placements').insert({
        slot,
        ad_type: adType,
        image_url: imageUrl,
        link_url: linkUrl || null,
        html_content: adType === 'html' ? htmlContent : null,
        width, height,
        is_active: true,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Ad created' });
      resetForm();
      await load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad: AdRow) => {
    const { error } = await supabase
      .from('ad_placements')
      .update({ is_active: !ad.is_active })
      .eq('id', ad.id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    load();
  };

  const remove = async (ad: AdRow) => {
    if (!confirm('Delete this ad?')) return;
    const { error } = await supabase.from('ad_placements').delete().eq('id', ad.id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Deleted' });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ads Management</h1>
        <p className="text-sm text-muted-foreground">Upload image, GIF, or HTML ads to display across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Ad</CardTitle>
          <CardDescription>Default size is 300×250. Supports images, GIFs and custom HTML.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Placement Slot</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ad Type</Label>
              <Select value={adType} onValueChange={(v) => setAdType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image (JPG/PNG/WebP)</SelectItem>
                  <SelectItem value="gif">Animated GIF</SelectItem>
                  <SelectItem value="html">Custom HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Width (px)</Label>
              <Input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value) || 300)} />
            </div>
            <div>
              <Label>Height (px)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value) || 250)} />
            </div>
          </div>

          {adType !== 'html' ? (
            <>
              <div>
                <Label>Upload File ({adType === 'gif' ? 'GIF' : 'Image'})</Label>
                <Input
                  type="file"
                  accept={adType === 'gif' ? 'image/gif' : 'image/png,image/jpeg,image/webp,image/gif'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label>Click-through URL (optional)</Label>
                <Input placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              </div>
            </>
          ) : (
            <div>
              <Label>HTML Content</Label>
              <Textarea
                rows={6}
                placeholder='<a href="https://..."><img src="..." /></a>'
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Rendered inside a {width}×{height} container.</p>
            </div>
          )}

          <Button onClick={handleCreate} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Create Ad'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Ads ({ads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
          ) : ads.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No ads yet.</div>
          ) : (
            <div className="space-y-3">
              {ads.map(ad => (
                <div key={ad.id} className="flex items-start gap-4 border rounded-lg p-3">
                  <div className="shrink-0 border bg-muted/30 flex items-center justify-center" style={{ width: 120, height: 100, overflow: 'hidden' }}>
                    {ad.ad_type === 'html' ? (
                      <span className="text-xs text-muted-foreground">HTML</span>
                    ) : ad.image_url ? (
                      <img src={ad.image_url} alt="" className="max-w-full max-h-full object-contain" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{SLOT_OPTIONS.find(s => s.value === ad.slot)?.label || ad.slot}</Badge>
                      <Badge variant="secondary" className="text-xs uppercase">{ad.ad_type}</Badge>
                      <Badge variant="outline" className="text-xs">{ad.width}×{ad.height}</Badge>
                    </div>
                    {ad.link_url && (
                      <a href={ad.link_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> {ad.link_url}
                      </a>
                    )}
                    <div className="text-xs text-muted-foreground">Created {new Date(ad.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch checked={ad.is_active} onCheckedChange={() => toggleActive(ad)} />
                      <span className="text-xs">{ad.is_active ? 'Active' : 'Off'}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(ad)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
