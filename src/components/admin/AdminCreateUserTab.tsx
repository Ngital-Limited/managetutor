import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users, CheckCircle2 } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

interface Props {
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

interface District { id: string; name_en: string; division_en: string; }
interface Area { id: string; name_en: string; district_id: string; }

export function AdminCreateUserTab({ toast }: Props) {
  const [role, setRole] = useState<'parent' | 'tutor' | 'agency'>('parent');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [bio, setBio] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<{ name: string; role: string; email: string; date: string }[]>([]);

  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    supabase.from('districts').select('id, name_en, division_en').order('name_en').then(({ data }) => setDistricts(data || []));
    supabase.from('areas').select('id, name_en, district_id').order('name_en').then(({ data }) => setAreas(data || []));
  }, []);

  const divisions = [...new Set(districts.map(d => d.division_en))].sort();
  const filteredDistricts = selectedDivision ? districts.filter(d => d.division_en === selectedDivision) : [];
  const filteredAreas = selectedDistrict ? areas.filter(a => a.district_id === selectedDistrict) : [];

  const resetForm = () => {
    setFullName(''); setEmail(''); setPhone(''); setPassword(''); setGender('male');
    setSelectedDivision(''); setSelectedDistrict(''); setSelectedArea(''); setBio('');
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password || password.length < 6) {
      toast({ title: 'Missing fields', description: 'Name, email, and password (min 6 chars) are required.', variant: 'destructive' });
      return;
    }
    if (!phone || phone.length < 10) {
      toast({ title: 'Phone Required', description: 'A valid phone number is required.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      // 1. Create auth user via admin-style signup
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } }
      });
      if (signUpErr) throw signUpErr;
      const userId = signUpData.user?.id;
      if (!userId) throw new Error('User creation failed');

      // 2. Update profile
      await supabase.from('profiles').update({
        full_name: fullName.trim(),
        phone,
        district_id: selectedDistrict || null,
        area_id: selectedArea || null,
        is_approved: true,
      }).eq('id', userId);

      // 3. Assign role
      await supabase.from('user_roles').insert({ user_id: userId, role });

      // 4. If tutor, create tutor_profiles
      if (role === 'tutor') {
        await supabase.from('tutor_profiles').insert({
          user_id: userId,
          gender,
          bio: bio.trim() || null,
          district_id: selectedDistrict || null,
          is_available: true,
        });
      }

      // 5. If agency, create agency_profiles
      if (role === 'agency') {
        await supabase.from('agency_profiles').insert({
          user_id: userId,
          agency_name: fullName.trim(),
        });
      }

      toast({ title: 'User Created!', description: `${fullName} has been registered as ${role}.` });
      setCreatedUsers(prev => [{ name: fullName, role, email, date: new Date().toISOString() }, ...prev]);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create User Profile</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> New User</CardTitle>
            <CardDescription>Register a new parent, tutor, or agency account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Role *</label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" placeholder="Enter full name" />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
            <div>
              <label className="text-sm font-medium">Password *</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" placeholder="Min 6 characters" />
            </div>

            {role === 'tutor' && (
              <div>
                <label className="text-sm font-medium">Gender *</label>
                <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Division → District → Area */}
            <div>
              <label className="text-sm font-medium">Division</label>
              <Select value={selectedDivision} onValueChange={v => { setSelectedDivision(v); setSelectedDistrict(''); setSelectedArea(''); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select division" /></SelectTrigger>
                <SelectContent>
                  {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedDivision && (
              <div>
                <label className="text-sm font-medium">District</label>
                <Select value={selectedDistrict} onValueChange={v => { setSelectedDistrict(v); setSelectedArea(''); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {filteredDistricts.map(d => <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedDistrict && filteredAreas.length > 0 && (
              <div>
                <label className="text-sm font-medium">Area / Thana</label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === 'tutor' && (
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} className="mt-1" rows={3} placeholder="Short bio..." />
              </div>
            )}

            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Recently Created</CardTitle>
            <CardDescription>Users created during this session</CardDescription>
          </CardHeader>
          <CardContent>
            {createdUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users created yet</p>
            ) : (
              <div className="space-y-3">
                {createdUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
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
