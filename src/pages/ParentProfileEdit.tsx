import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PhoneInput, isValidBDPhone } from '@/components/PhoneInput';
import { ArrowLeft, Save, Upload, User, MapPin, Phone, Mail } from 'lucide-react';

interface District { id: string; name_en: string; name_bn: string; division_en: string; }
interface Area { id: string; name_en: string; name_bn: string; district_id: string; }

export default function ParentProfileEdit() {
  const { user, role, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId: adminEditUserId } = useParams<{ userId: string }>();
  const isAdminEdit = role === 'admin' && !!adminEditUserId;
  const targetUserId = isAdminEdit ? adminEditUserId : user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedDivisionState, setSelectedDivisionState] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    full_name_bn: '',
    phone: '',
    email: '',
    district_id: '',
    area_id: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdminEdit && role !== 'parent') {
        navigate('/dashboard');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, adminEditUserId]);

  const fetchData = async () => {
    const [profileRes, districtsRes, areasRes] = await Promise.all([
      supabase.from('profiles').select('full_name, full_name_bn, phone, email, district_id, area_id, avatar_url').eq('id', targetUserId).single(),
      supabase.from('districts').select('id, name_en, name_bn, division_en').order('name_en'),
      supabase.from('areas').select('*').order('name_en'),
    ]);
    if (profileRes.data) {
      setForm({
        full_name: profileRes.data.full_name || '',
        full_name_bn: profileRes.data.full_name_bn || '',
        phone: profileRes.data.phone || '',
        email: profileRes.data.email || user?.email || '',
        district_id: profileRes.data.district_id || '',
        area_id: profileRes.data.area_id || '',
        avatar_url: profileRes.data.avatar_url || '',
      });
    }
    if (districtsRes.data) {
      setDistricts(districtsRes.data);
      // Set initial division from existing district
      if (profileRes.data?.district_id) {
        const dist = districtsRes.data.find(d => d.id === profileRes.data.district_id);
        if (dist) setSelectedDivisionState(dist.division_en);
      }
    }
    if (areasRes.data) setAreas(areasRes.data);
    setLoading(false);
  };

  const cityOptions = areas
    .map(a => {
      const dist = districts.find(d => d.id === a.district_id);
      return { id: a.id, label: dist ? `${a.name_en} (${dist.name_en})` : a.name_en };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleSave = async () => {
    if (!form.phone) {
      toast({ title: 'Phone Required', description: 'Phone number is mandatory. Please enter your phone number.', variant: 'destructive' });
      return;
    }
    if (!isValidBDPhone(form.phone)) {
      toast({ title: 'Invalid Phone', description: 'Please enter a valid Bangladesh phone number.', variant: 'destructive' });
      return;
    }
    if (!form.full_name.trim()) {
      toast({ title: 'Name Required', description: 'Full name is mandatory.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      full_name_bn: form.full_name_bn || null,
      phone: form.phone,
      district_id: form.district_id || null,
      area_id: form.area_id || null,
      avatar_url: form.avatar_url || null,
    }).eq('id', targetUserId);

    if (error) {
      const msg = error.message?.includes('idx_profiles_phone_unique')
        ? 'This phone number is already registered with another account.'
        : error.message?.includes('profiles_email_unique')
        ? 'This email is already registered with another account.'
        : error.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Profile saved!', description: isAdminEdit ? 'Parent profile has been updated.' : 'Your profile has been updated.' });
      if (isAdminEdit) navigate('/admin');
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${targetUserId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setForm({ ...form, avatar_url: urlData.publicUrl });
    setUploading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const backLink = isAdminEdit ? '/admin' : '/parent/dashboard';
  const backLabel = isAdminEdit ? 'Back to Admin' : 'Back to Dashboard';

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={backLink}>
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
          </Link>
          {isAdminEdit && <span className="text-sm text-muted-foreground">Editing parent profile as admin</span>}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">{isAdminEdit ? 'Edit Parent Profile' : 'Edit Profile'}</h1>
        <p className="text-muted-foreground mb-8">{isAdminEdit ? `Editing profile for user` : 'Update your personal information'}</p>

        <div className="space-y-6">
          {/* Avatar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={form.avatar_url} />
                <AvatarFallback className="text-2xl">{form.full_name?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </div>
                </Label>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name (English) <span className="text-destructive">*</span></Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Full Name (Bangla)</Label>
                <Input value={form.full_name_bn} onChange={(e) => setForm({ ...form, full_name_bn: e.target.value })} placeholder="বাংলা নাম" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number <span className="text-destructive">*</span></Label>
                <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address <span className="text-destructive">*</span></Label>
                <Input value={form.email} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground mt-1">Email is linked to your account and cannot be changed here.</p>
              </div>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> City (Thana / Upazila)</Label>
                <Select
                  value={form.area_id}
                  onValueChange={(v) => {
                    const area = areas.find(a => a.id === v);
                    setForm({ ...form, area_id: v, district_id: area?.district_id || '' });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {cityOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </main>
    </div>
  );
}
