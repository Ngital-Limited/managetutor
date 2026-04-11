import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneInput, isValidBDPhone } from '@/components/PhoneInput';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, ArrowLeft, Save, Upload, FileText, CheckCircle2,
  Clock, XCircle, AlertCircle, Trash2, Globe, User, MapPin
} from 'lucide-react';

interface Subject { id: string; name_en: string; name_bn: string; }
interface District { id: string; name_en: string; name_bn: string; }
interface TutorProfile {
  id: string;
  bio: string;
  education: string;
  experience_years: number;
  hourly_rate_min: number;
  hourly_rate_max: number;
  teaching_mode: string;
  gender: string;
  is_available: boolean;
  verification_status: string;
}
interface VerificationDoc {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
}

export default function TutorProfile() {
  const { user, role, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [selectedClassLevels, setSelectedClassLevels] = useState<string[]>([]);

  const [profile, setProfile] = useState({
    bio: '',
    education: '',
    experience_years: 0,
    hourly_rate_min: 500,
    hourly_rate_max: 1500,
    teaching_mode: 'in_person',
    gender: 'male',
    is_available: true,
    verification_status: 'pending',
    father_phone: '',
    mother_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    education_detail: '',
    present_address: '',
    permanent_address: '',
  });

  const [userProfile, setUserProfile] = useState({
    full_name: '',
    phone: '',
    district_id: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'tutor') {
        navigate('/dashboard');
      } else {
        fetchData();
      }
    }
  }, [user, role, authLoading]);

  const fetchData = async () => {
    const [subjectsRes, districtsRes, profileRes, tutorRes, docsRes, tutorSubjectsRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name_en'),
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('profiles').select('*').eq('id', user?.id).single(),
      supabase.from('tutor_profiles').select('*').eq('user_id', user?.id).single(),
      supabase.from('verification_documents').select('*').eq('tutor_id', user?.id),
      supabase.from('tutor_subjects').select('subject_id').eq('tutor_profile_id', user?.id),
    ]);

    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (profileRes.data) {
      setUserProfile({
        full_name: profileRes.data.full_name || '',
        phone: profileRes.data.phone || '',
        district_id: profileRes.data.district_id || '',
      });
    }
    if (tutorRes.data) {
      setProfile({
        bio: tutorRes.data.bio || '',
        education: tutorRes.data.education || '',
        experience_years: tutorRes.data.experience_years || 0,
        hourly_rate_min: tutorRes.data.hourly_rate_min || 500,
        hourly_rate_max: tutorRes.data.hourly_rate_max || 1500,
        teaching_mode: tutorRes.data.teaching_mode || 'in_person',
        gender: tutorRes.data.gender || 'male',
        is_available: tutorRes.data.is_available ?? true,
        verification_status: tutorRes.data.verification_status || 'pending',
        father_phone: (tutorRes.data as any).father_phone || '',
        mother_phone: (tutorRes.data as any).mother_phone || '',
        emergency_contact_name: (tutorRes.data as any).emergency_contact_name || '',
        emergency_contact_phone: (tutorRes.data as any).emergency_contact_phone || '',
        education_detail: (tutorRes.data as any).education_detail || '',
        present_address: (tutorRes.data as any).present_address || '',
        permanent_address: (tutorRes.data as any).permanent_address || '',
      });
      setSelectedClassLevels((tutorRes.data as any).class_levels || []);
    }
    if (docsRes.data) setDocuments(docsRes.data);
    if (tutorSubjectsRes.data) {
      setSelectedSubjects(tutorSubjectsRes.data.map(s => s.subject_id));
    }

    setLoading(false);
  };

  const handleSave = async () => {
    // Validate phone numbers
    const phoneFields = [
      { value: userProfile.phone, label: 'Phone Number' },
      { value: profile.father_phone, label: "Father's Phone" },
      { value: profile.mother_phone, label: "Mother's Phone" },
      { value: profile.emergency_contact_phone, label: 'Emergency Contact Phone' },
    ];
    const invalidPhone = phoneFields.find(f => f.value && !isValidBDPhone(f.value));
    if (invalidPhone) {
      toast({ title: 'Invalid Phone', description: `${invalidPhone.label} is not a valid Bangladesh phone number.`, variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Update user profile
    await supabase.from('profiles').update({
      full_name: userProfile.full_name,
      phone: userProfile.phone,
      district_id: userProfile.district_id || null,
    }).eq('id', user?.id);

    // Get tutor profile ID
    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (tutorData) {
      // Update tutor profile
      await supabase.from('tutor_profiles').update({
        bio: profile.bio,
        education: profile.education,
        experience_years: profile.experience_years,
        hourly_rate_min: profile.hourly_rate_min,
        hourly_rate_max: profile.hourly_rate_max,
        teaching_mode: profile.teaching_mode as 'online' | 'in_person' | 'hybrid',
        gender: profile.gender as 'male' | 'female',
        is_available: profile.is_available,
        father_phone: profile.father_phone || null,
        mother_phone: profile.mother_phone || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        education_detail: profile.education_detail || null,
        present_address: profile.present_address || null,
        permanent_address: profile.permanent_address || null,
        class_levels: selectedClassLevels,
      } as any).eq('id', tutorData.id);

      // Update subjects - delete old and insert new
      await supabase.from('tutor_subjects').delete().eq('tutor_profile_id', tutorData.id);
      if (selectedSubjects.length > 0) {
        await supabase.from('tutor_subjects').insert(
          selectedSubjects.map(subjectId => ({
            tutor_profile_id: tutorData.id,
            subject_id: subjectId,
          }))
        );
      }
    }

    toast({ title: 'Profile saved!', description: 'Your profile has been updated successfully.' });
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${docType}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName);

    // Get tutor profile ID
    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (tutorData) {
      await supabase.from('verification_documents').insert({
        tutor_id: tutorData.id,
        document_type: docType,
        document_url: urlData.publicUrl,
        status: 'pending',
      });

      fetchData();
      toast({ title: 'Document uploaded!', description: 'Your document is pending verification.' });
    }

    setUploading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Manage Tutor</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
              <Globe className="h-4 w-4 mr-1" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            <Link to="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">Update your tutor profile to attract more students</p>
          </div>
          {getStatusBadge(profile.verification_status || 'pending')}
        </div>

        <div className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={userProfile.full_name}
                    onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <PhoneInput
                    value={userProfile.phone}
                    onChange={(v) => setUserProfile({ ...userProfile, phone: v })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Gender</Label>
                  <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Select value={userProfile.district_id} onValueChange={(v) => setUserProfile({ ...userProfile, district_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.id} value={d.id}>{language === 'en' ? d.name_en : d.name_bn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Bio / About You</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell parents about yourself, your teaching style, and experience..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Education</Label>
                <Textarea
                  value={profile.education}
                  onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                  placeholder="Your educational background (e.g., BSc in Physics from Dhaka University)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Family Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Contact & Family Details
              </CardTitle>
              <CardDescription>Provide family contact info and addresses for verification purposes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Father's Phone</Label>
                  <PhoneInput
                    value={profile.father_phone}
                    onChange={(v) => setProfile({ ...profile, father_phone: v })}
                  />
                </div>
                <div>
                  <Label>Mother's Phone</Label>
                  <PhoneInput
                    value={profile.mother_phone}
                    onChange={(v) => setProfile({ ...profile, mother_phone: v })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input
                    value={profile.emergency_contact_name}
                    onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                    placeholder="e.g., Uncle, Guardian"
                  />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <PhoneInput
                    value={profile.emergency_contact_phone}
                    onChange={(v) => setProfile({ ...profile, emergency_contact_phone: v })}
                  />
                </div>
              </div>
              <div>
                <Label>Detailed Education</Label>
                <Textarea
                  value={profile.education_detail}
                  onChange={(e) => setProfile({ ...profile, education_detail: e.target.value })}
                  placeholder="Institution name, degree, department, passing year, GPA/CGPA..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Present Address</Label>
                <Textarea
                  value={profile.present_address}
                  onChange={(e) => setProfile({ ...profile, present_address: e.target.value })}
                  placeholder="Your current address..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Permanent Address</Label>
                <Textarea
                  value={profile.permanent_address}
                  onChange={(e) => setProfile({ ...profile, permanent_address: e.target.value })}
                  placeholder="Your permanent address..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Teaching Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Experience (Years)</Label>
                  <Input
                    type="number"
                    value={profile.experience_years}
                    onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Min Rate (৳/hr)</Label>
                  <Input
                    type="number"
                    value={profile.hourly_rate_min}
                    onChange={(e) => setProfile({ ...profile, hourly_rate_min: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Max Rate (৳/hr)</Label>
                  <Input
                    type="number"
                    value={profile.hourly_rate_max}
                    onChange={(e) => setProfile({ ...profile, hourly_rate_max: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Teaching Mode</Label>
                  <Select value={profile.teaching_mode} onValueChange={(v) => setProfile({ ...profile, teaching_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In-Person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="available"
                    checked={profile.is_available}
                    onCheckedChange={(checked) => setProfile({ ...profile, is_available: !!checked })}
                  />
                  <Label htmlFor="available">Available for new students</Label>
                </div>
              </div>

              {/* Subjects */}
              <div>
                <Label className="mb-3 block">Subjects You Teach</Label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map(subject => (
                    <Badge
                      key={subject.id}
                      variant={selectedSubjects.includes(subject.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedSubjects.includes(subject.id)) {
                          setSelectedSubjects(selectedSubjects.filter(s => s !== subject.id));
                        } else {
                          setSelectedSubjects([...selectedSubjects, subject.id]);
                        }
                      }}
                    >
                      {language === 'en' ? subject.name_en : subject.name_bn}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Class Levels */}
              <div>
                <Label className="mb-3 block">Class Levels You Teach</Label>
                <div className="space-y-4">
                  {CLASS_LEVELS.map(group => (
                    <div key={group.group}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{group.group}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(level => (
                          <Badge
                            key={level}
                            variant={selectedClassLevels.includes(level) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              if (selectedClassLevels.includes(level)) {
                                setSelectedClassLevels(selectedClassLevels.filter(l => l !== level));
                              } else {
                                setSelectedClassLevels([...selectedClassLevels, level]);
                              }
                            }}
                          >
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Verification Documents
              </CardTitle>
              <CardDescription>Upload documents to get verified and build trust with parents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {['national_id', 'education_certificate', 'experience_certificate'].map((docType) => {
                  const exists = documents.some(d => d.document_type === docType);
                  return (
                    <div key={docType} className={`border-2 border-dashed rounded-xl p-4 text-center ${exists ? 'border-success/50 bg-success/5' : 'border-border'}`}>
                      <Upload className={`h-8 w-8 mx-auto mb-2 ${exists ? 'text-success' : 'text-muted-foreground'}`} />
                      <p className="font-medium capitalize">{docType.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {exists ? 'Uploaded' : 'PDF, JPG, PNG (max 5MB)'}
                      </p>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" disabled={uploading} asChild>
                          <span>{exists ? 'Replace' : 'Upload'}</span>
                        </Button>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, docType)}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 p-4 bg-info/10 rounded-xl text-info">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Why verify?</p>
                  <p className="opacity-80">Verified tutors get a badge on their profile and appear higher in search results. Parents trust verified tutors more!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link to="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
