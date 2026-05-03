import { useState, useEffect, useMemo } from 'react';
import { formatExactDate } from '@/lib/date';
import { Logo } from '@/components/Logo';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { UNIVERSITY_OPTIONS } from '@/constants/universities';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PhoneInput, isValidBDPhone } from '@/components/PhoneInput';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getMinProfileCompleteness } from '@/lib/profileCompleteness';
import {
  GraduationCap, ArrowLeft, Save, Upload, FileText, CheckCircle2,
  Clock, XCircle, AlertCircle, Video, MessageSquare, Send,
  Plus, Trash2, Briefcase, BookOpen, Users, Sparkles, Loader2, RefreshCw, Calendar
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


interface Subject { id: string; name_en: string; }
interface District { id: string; name_en: string; division_en: string; }
interface EducationEntry {
  id?: string;
  institution: string;
  degree: string;
  field_of_study: string;
  passing_year: number | null;
  result: string;
  is_current: boolean;
  current_semester: string;
  medium: string;
}
interface JobExperienceEntry {
  id?: string;
  company: string;
  designation: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string;
}
interface VerificationDoc {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
}

export default function TutorProfile() {
  const { user, role, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId: adminEditUserId } = useParams<{ userId: string }>();
  const isAdminEdit = role === 'admin' && !!adminEditUserId;
  const targetUserId = isAdminEdit ? adminEditUserId : user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minCompleteness, setMinCompleteness] = useState(70);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<{ id: string; name_en: string; district_id: string }[]>([]);
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedClassLevels, setSelectedClassLevels] = useState<string[]>([]);

  // Identity document (NID / Passport / Birth Certificate)
  const [idDocType, setIdDocType] = useState<string>('nid');
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [idDocUploadedAt, setIdDocUploadedAt] = useState<string | null>(null);
  const [idDocUploading, setIdDocUploading] = useState(false);

  // Education & Job Experience
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [manualInstitution, setManualInstitution] = useState<Record<string, boolean>>({});
  const [jobExperiences, setJobExperiences] = useState<JobExperienceEntry[]>([]);

  const [profile, setProfile] = useState({
    bio: '',
    education: '',
    experience_years: 0,
    monthly_salary_min: 500,
    monthly_salary_max: 1500,
    teaching_mode: 'in_person',
    gender: 'male',
    is_available: true,
    is_student: false,
    verification_status: 'pending',
    father_phone: '',
    mother_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    education_detail: '',
    present_address: '',
    permanent_address: '',
    video_url: '',
    teaching_philosophy: '',
    success_stories: '',
    // New personal detail fields
    father_name: '',
    mother_name: '',
    date_of_birth: '',
    marital_status: '',
    nationality: 'Bangladeshi',
    national_id_no: '',
    religion: '',
    height: '',
    weight: '',
    weekly_availability: {} as Record<string, string[]>,
  });

  const [tutorProfileId, setTutorProfileId] = useState<string | null>(null);
  // reviews removed

  const [userProfile, setUserProfile] = useState({
    full_name: '',
    phone: '',
    email: '',
    district_id: '',
    area_id: '',
    avatar_url: '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => { getMinProfileCompleteness().then(setMinCompleteness); }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'tutor' && role !== 'admin') {
        navigate('/dashboard');
      } else if (role === 'tutor' || isAdminEdit) {
        fetchData();
      } else {
        navigate('/dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, authLoading, adminEditUserId]);

  const fetchData = async () => {
    const [subjectsRes, districtsRes, profileRes, tutorRes, areasRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name_en'),
      supabase.from('districts').select('id, name_en, division_en').order('name_en'),
      supabase.from('profiles').select('*').eq('id', targetUserId).single(),
      supabase.from('tutor_profiles').select('*').eq('user_id', targetUserId).single(),
      supabase.from('areas').select('*').order('name_en'),
    ]);

    // Fetch docs and tutor_subjects using tutor_profiles.id (not auth user_id)
    const tutorProfileId = (tutorRes.data as any)?.id;
    const [docsRes, tutorSubjectsRes] = await Promise.all([
      tutorProfileId
        ? supabase.from('verification_documents').select('*').eq('tutor_id', tutorProfileId)
        : Promise.resolve({ data: [] as any[] }),
      tutorProfileId
        ? supabase.from('tutor_subjects').select('subject_id').eq('tutor_profile_id', tutorProfileId)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (areasRes.data) setAreas(areasRes.data);
    if (profileRes.data) {
      setUserProfile({
        full_name: profileRes.data.full_name || '',
        phone: profileRes.data.phone || '',
        email: profileRes.data.email || user?.email || '',
        district_id: profileRes.data.district_id || '',
        area_id: profileRes.data.area_id || '',
        avatar_url: profileRes.data.avatar_url || '',
      });
    }
    if (tutorRes.data) {
      const td = tutorRes.data as any;
      setProfile({
        bio: td.bio || '',
        education: td.education || '',
        experience_years: td.experience_years || 0,
        monthly_salary_min: td.monthly_salary_min || 500,
        monthly_salary_max: td.monthly_salary_max || 1500,
        teaching_mode: td.teaching_mode || 'in_person',
        gender: td.gender || 'male',
        is_available: td.is_available ?? true,
        is_student: td.is_student || false,
        verification_status: td.verification_status || 'pending',
        father_phone: td.father_phone || '',
        mother_phone: td.mother_phone || '',
        emergency_contact_name: td.emergency_contact_name || '',
        emergency_contact_phone: td.emergency_contact_phone || '',
        education_detail: td.education_detail || '',
        present_address: td.present_address || '',
        permanent_address: td.permanent_address || '',
        video_url: td.video_url || '',
        teaching_philosophy: td.teaching_philosophy || '',
        success_stories: td.success_stories || '',
        father_name: td.father_name || '',
        mother_name: td.mother_name || '',
        date_of_birth: td.date_of_birth || '',
        marital_status: td.marital_status || '',
        nationality: td.nationality || 'Bangladeshi',
        national_id_no: td.national_id_no || '',
        religion: td.religion || '',
        height: td.height || '',
        weight: td.weight || '',
        weekly_availability: td.weekly_availability || {},
      });
      setSelectedClassLevels(td.class_levels || []);
      setTutorProfileId(td.id);
      if (td.id_document_type) setIdDocType(td.id_document_type);
      setIdDocUrl(td.id_document_url || null);
      setIdDocUploadedAt(td.id_document_uploaded_at || null);

      // Fetch education entries and job experiences
      const [eduRes, jobRes] = await Promise.all([
        supabase.from('tutor_education').select('*').eq('tutor_id', td.id).order('passing_year', { ascending: false }),
        supabase.from('tutor_job_experiences').select('*').eq('tutor_id', td.id).order('start_date', { ascending: false }),
      ]);

      // Always seed 4 fixed education slots: SSC, HSC, Bachelor, Masters
      const FIXED_DEGREES = ['SSC', 'HSC', 'Bachelor', 'Masters'];
      const existing = eduRes.data || [];
      const knownUnis = new Set(UNIVERSITY_OPTIONS.map(o => o.value));
      const manualMap: Record<string, boolean> = {};
      setEducationEntries(FIXED_DEGREES.map((deg) => {
        const match = existing.find((e: any) => (e.degree || '').toLowerCase() === deg.toLowerCase());
        const inst = match?.institution || '';
        if ((deg === 'Bachelor' || deg === 'Masters') && inst && !knownUnis.has(inst)) {
          manualMap[deg] = true;
        }
        return {
          id: match?.id,
          institution: inst,
          degree: deg,
          field_of_study: match?.field_of_study || '',
          passing_year: match?.passing_year ?? null,
          result: match?.result || '',
          is_current: match?.is_current || false,
          current_semester: (match as any)?.current_semester || '',
          medium: (match as any)?.medium || '',
        };
      }));
      setManualInstitution(manualMap);
      if (jobRes.data) {
        setJobExperiences(jobRes.data.map((j: any) => ({
          id: j.id,
          company: j.company,
          designation: j.designation,
          start_date: j.start_date || '',
          end_date: j.end_date || '',
          is_current: j.is_current || false,
          responsibilities: j.responsibilities || '',
        })));
      }
    }
    if (docsRes.data) setDocuments(docsRes.data);
    if (tutorSubjectsRes.data) {
      setSelectedSubjects(tutorSubjectsRes.data.map(s => s.subject_id));
    }

    setLoading(false);
  };

  // Completeness warnings (non-blocking) shown after save
  const getCompletenessWarnings = (): string[] => {
    const warnings: string[] = [];
    if (!userProfile.avatar_url) warnings.push('Profile picture');
    if (!profile.father_name?.trim()) warnings.push("Father's Name");
    if (!profile.mother_name?.trim()) warnings.push("Mother's Name");
    if (!profile.father_phone?.trim()) warnings.push("Father's Phone");
    if (!profile.mother_phone?.trim()) warnings.push("Mother's Phone");
    if (!profile.emergency_contact_name?.trim()) warnings.push('Emergency Contact Name');
    if (!profile.emergency_contact_phone?.trim()) warnings.push('Emergency Contact Phone');
    if (!idDocUrl) warnings.push('Identity Document (NID/Passport)');
    if (profile.is_student) {
      const hasUniDoc = documents.some(d => d.document_type === 'university_id_card' || d.document_type === 'university_payslip');
      if (!hasUniDoc) warnings.push('University ID Card or Payslip');
    } else {
      const hasEduCert = documents.some(d => d.document_type === 'education_certificate');
      if (!hasEduCert) warnings.push('Educational Certificate');
    }
    return warnings;
  };

  const handleSave = async () => {
    // Only enforce minimal required fields for saving
    if (!userProfile.full_name.trim()) {
      toast({ title: 'Name Required', description: 'Full name is mandatory.', variant: 'destructive' });
      return;
    }
    if (userProfile.phone && !isValidBDPhone(userProfile.phone)) {
      toast({ title: 'Invalid Phone', description: 'Phone number is not a valid Bangladesh phone number.', variant: 'destructive' });
      return;
    }

    // Validate family phone formats only if provided
    const phoneFields = [
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

    const { error: profileError } = await supabase.from('profiles').update({
      full_name: userProfile.full_name,
      phone: userProfile.phone,
      district_id: userProfile.district_id || null,
      area_id: userProfile.area_id || null,
      avatar_url: userProfile.avatar_url || null,
    }).eq('id', targetUserId);

    if (profileError) {
      const msg = profileError.message?.includes('idx_profiles_phone_unique')
        ? 'This phone number is already registered with another account.'
        : profileError.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', targetUserId)
      .single();

    if (tutorData) {
      const { error: tutorUpdateError } = await supabase.from('tutor_profiles').update({
        bio: profile.bio,
        education: profile.education,
        experience_years: profile.experience_years,
        monthly_salary_min: profile.monthly_salary_min,
        monthly_salary_max: profile.monthly_salary_max,
        teaching_mode: profile.teaching_mode as 'online' | 'in_person' | 'hybrid',
        gender: profile.gender as 'male' | 'female',
        is_available: profile.is_available,
        is_student: profile.is_student,
        father_phone: profile.father_phone || null,
        mother_phone: profile.mother_phone || null,
        emergency_contact_name: profile.emergency_contact_name || null,
        emergency_contact_phone: profile.emergency_contact_phone || null,
        education_detail: profile.education_detail || null,
        present_address: profile.present_address || null,
        permanent_address: profile.permanent_address || null,
        class_levels: selectedClassLevels,
        video_url: profile.video_url || null,
        teaching_philosophy: profile.teaching_philosophy || null,
        success_stories: profile.success_stories || null,
        father_name: profile.father_name || null,
        mother_name: profile.mother_name || null,
        date_of_birth: profile.date_of_birth ? profile.date_of_birth : null,
        marital_status: profile.marital_status || null,
        nationality: profile.nationality || null,
        national_id_no: profile.national_id_no || null,
        religion: profile.religion || null,
        height: profile.height || null,
        weight: profile.weight || null,
        weekly_availability: profile.weekly_availability || {},
        district_id: userProfile.district_id || null,
        area_id: userProfile.area_id || null,
      } as any).eq('id', tutorData.id);

      if (tutorUpdateError) {
        toast({ title: 'Error saving profile', description: tutorUpdateError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Update subjects
      await supabase.from('tutor_subjects').delete().eq('tutor_profile_id', tutorData.id);
      if (selectedSubjects.length > 0) {
        await supabase.from('tutor_subjects').insert(
          selectedSubjects.map(subjectId => ({
            tutor_profile_id: tutorData.id,
            subject_id: subjectId,
          }))
        );
      }

      // Save education entries
      // Delete removed entries
      const existingEduIds = educationEntries.filter(e => e.id).map(e => e.id!);
      const { data: currentEdu } = await supabase.from('tutor_education').select('id').eq('tutor_id', tutorData.id);
      if (currentEdu) {
        const toDelete = currentEdu.filter(e => !existingEduIds.includes(e.id));
        for (const d of toDelete) {
          await supabase.from('tutor_education').delete().eq('id', d.id);
        }
      }
      // Upsert education entries
      for (const entry of educationEntries) {
        if (!entry.institution || !entry.degree) continue;
        const semesterValue = entry.is_current && (entry.degree === 'Bachelor' || entry.degree === 'Masters')
          ? (entry.current_semester || null)
          : null;
        if (entry.id) {
          await supabase.from('tutor_education').update({
            institution: entry.institution,
            degree: entry.degree,
            field_of_study: entry.field_of_study || null,
            passing_year: entry.passing_year,
            result: entry.result || null,
            is_current: entry.is_current,
            current_semester: semesterValue,
            medium: entry.medium || null,
          } as any).eq('id', entry.id);
        } else {
          const { data: newEdu } = await supabase.from('tutor_education').insert({
            tutor_id: tutorData.id,
            institution: entry.institution,
            degree: entry.degree,
            field_of_study: entry.field_of_study || null,
            passing_year: entry.passing_year,
            result: entry.result || null,
            is_current: entry.is_current,
            current_semester: semesterValue,
            medium: entry.medium || null,
          } as any).select('id').single();
          if (newEdu) entry.id = newEdu.id;
        }
      }

      // Save job experiences
      const existingJobIds = jobExperiences.filter(j => j.id).map(j => j.id!);
      const { data: currentJobs } = await supabase.from('tutor_job_experiences').select('id').eq('tutor_id', tutorData.id);
      if (currentJobs) {
        const toDelete = currentJobs.filter(j => !existingJobIds.includes(j.id));
        for (const d of toDelete) {
          await supabase.from('tutor_job_experiences').delete().eq('id', d.id);
        }
      }
      for (const entry of jobExperiences) {
        if (!entry.company || !entry.designation) continue;
        if (entry.id) {
          await supabase.from('tutor_job_experiences').update({
            company: entry.company,
            designation: entry.designation,
            start_date: entry.start_date || null,
            end_date: entry.is_current ? null : (entry.end_date || null),
            is_current: entry.is_current,
            responsibilities: entry.responsibilities || null,
          }).eq('id', entry.id);
        } else {
          const { data: newJob } = await supabase.from('tutor_job_experiences').insert({
            tutor_id: tutorData.id,
            company: entry.company,
            designation: entry.designation,
            start_date: entry.start_date || null,
            end_date: entry.is_current ? null : (entry.end_date || null),
            is_current: entry.is_current,
            responsibilities: entry.responsibilities || null,
          }).select('id').single();
          if (newJob) entry.id = newJob.id;
        }
      }
    }

    const warnings = getCompletenessWarnings();
    if (warnings.length > 0) {
      toast({
        title: 'Profile saved!',
        description: `Still missing for full approval: ${warnings.slice(0, 3).join(', ')}${warnings.length > 3 ? ` and ${warnings.length - 3} more` : ''}`,
      });
    } else {
      toast({ title: 'Profile saved!', description: 'Your profile is complete and ready for review.' });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Profile picture must be under 5MB.', variant: 'destructive' });
      return;
    }
    setAvatarUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${targetUserId}/avatar-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setUserProfile((p) => ({ ...p, avatar_url: urlData.publicUrl }));
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', targetUserId);
    setAvatarUploading(false);
    toast({ title: 'Profile picture updated' });
  };

  const handleIdDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum size is 10MB.', variant: 'destructive' });
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Upload JPG, PNG, WEBP, or PDF.', variant: 'destructive' });
      return;
    }
    setIdDocUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${targetUserId}/${idDocType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('verification-documents')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('tutor_profiles')
        .update({ id_document_type: idDocType, id_document_url: path, id_document_uploaded_at: nowIso })
        .eq('user_id', targetUserId);
      if (updErr) throw updErr;
      setIdDocUrl(path);
      setIdDocUploadedAt(nowIso);
      toast({ title: 'Document uploaded', description: 'Our team will review it shortly.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIdDocUploading(false);
      e.target.value = '';
    }
  };

  const handleViewIdDoc = async () => {
    if (!idDocUrl) return;
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(idDocUrl, 60);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
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

  const handleViewDoc = async (docUrl: string) => {
    // Extract storage path from public URL: .../verification-documents/<path>
    const marker = '/verification-documents/';
    const idx = docUrl.indexOf(marker);
    const path = idx >= 0 ? decodeURIComponent(docUrl.substring(idx + marker.length)) : docUrl;
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(path, 60);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
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

  const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  // Education helpers — fixed 4 slots (SSC, HSC, Bachelor, Masters)
  const updateEducation = (index: number, field: keyof EducationEntry, value: any) => {
    const updated = [...educationEntries];
    (updated[index] as any)[field] = value;
    setEducationEntries(updated);
  };

  // Job experience helpers
  const addJobExperience = () => {
    setJobExperiences([...jobExperiences, { company: '', designation: '', start_date: '', end_date: '', is_current: false, responsibilities: '' }]);
  };
  const removeJobExperience = (index: number) => {
    setJobExperiences(jobExperiences.filter((_, i) => i !== index));
  };
  const updateJobExperience = (index: number, field: keyof JobExperienceEntry, value: any) => {
    const updated = [...jobExperiences];
    (updated[index] as any)[field] = value;
    setJobExperiences(updated);
  };

  // Profile completeness — same scoring used by the apply gate (10 pts × 10 items = 100)
  const completeness = useMemo(() => {
    const requiredDegree = profile.is_student ? 'HSC' : 'Bachelor';
    const reqEdu = educationEntries.find(e => (e.degree || '').toLowerCase() === requiredDegree.toLowerCase());
    const items = [
      
      { label: `${requiredDegree} education`, ok: !!reqEdu?.institution?.trim() },
      { label: 'Years of experience', ok: !!profile.experience_years && profile.experience_years > 0 },
      { label: 'Monthly salary range', ok: !!profile.monthly_salary_min && profile.monthly_salary_min > 0 },
      { label: 'Gender', ok: !!profile.gender },
      { label: 'District', ok: !!userProfile.district_id },
      { label: 'Teaching mode', ok: !!profile.teaching_mode },
      { label: 'Class levels', ok: selectedClassLevels.length > 0 },
      { label: 'Verified badge (admin approval)', ok: profile.verification_status === 'approved' },
      { label: 'At least one subject', ok: selectedSubjects.length > 0 },
    ];
    const score = items.filter(i => i.ok).length * 10;
    return { score, items, missing: items.filter(i => !i.ok).map(i => i.label) };
  }, [profile, educationEntries, userProfile.district_id, selectedClassLevels, selectedSubjects]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const profileContent = (
    <div className="px-4 md:px-6 py-6 max-w-[1200px] mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-4 mb-6 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">Update your tutor profile information</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(profile.verification_status || 'pending')}
            <Button onClick={handleSave} disabled={saving} className="rounded-xl shadow-sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Profile completeness */}
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Profile Completeness</span>
              <span className={`text-xs font-semibold ${completeness.score >= minCompleteness ? 'text-success' : 'text-warning'}`}>
                {completeness.score}%
              </span>
              {completeness.score < minCompleteness && (
                <span className="text-[11px] text-muted-foreground">• {minCompleteness}% required to apply for jobs</span>
              )}
            </div>
          </div>
          <div className="relative">
            <Progress value={completeness.score} className="h-2" />
            <div
              className="absolute top-[-3px] h-[14px] w-0.5 bg-foreground/70"
              style={{ left: `${minCompleteness}%` }}
              title={`Required threshold: ${minCompleteness}%`}
            />
          </div>
          {completeness.missing.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {completeness.missing.map(m => (
                <Badge key={m} variant="outline" className="text-[10px] border-warning/40 text-warning font-normal">
                  {m}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <div className="rounded-2xl bg-muted/40 p-1.5 overflow-x-auto">
          <TabsList className="bg-transparent h-auto p-0 gap-1 w-max md:w-full md:grid md:grid-cols-7">
            <TabsTrigger value="personal" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Personal</TabsTrigger>
            <TabsTrigger value="education" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Education</TabsTrigger>
            <TabsTrigger value="experience" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Experience</TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Subjects</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Preferences</TabsTrigger>
            <TabsTrigger value="family" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Family</TabsTrigger>
            <TabsTrigger value="media" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border px-4 py-2">Media</TabsTrigger>
          </TabsList>
        </div>

        {/* PERSONAL TAB */}
        <TabsContent value="personal" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-5">
              {/* Profile Picture - Mandatory */}
              <div className="flex items-center gap-5 pb-5 border-b border-border/60">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={userProfile.avatar_url} />
                  <AvatarFallback className="text-2xl">{userProfile.full_name?.charAt(0) || 'T'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label className="font-medium">Profile Picture <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">Required. JPG/PNG, max 5MB.</p>
                  <label htmlFor="tutor-avatar-upload" className="cursor-pointer inline-flex">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-muted transition-colors text-sm">
                      <Upload className="h-4 w-4" />
                      {avatarUploading ? 'Uploading...' : (userProfile.avatar_url ? 'Replace Photo' : 'Upload Photo')}
                    </div>
                  </label>
                  <input id="tutor-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={userProfile.full_name} onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Phone Number <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5"><PhoneInput value={userProfile.phone} onChange={(v) => setUserProfile({ ...userProfile, phone: v })} /></div>
                </div>
              </div>
              <div>
                <Label>Email Address <span className="text-destructive">*</span></Label>
                <Input className="rounded-xl mt-1.5 h-11 bg-muted/50" value={userProfile.email} disabled />
                <p className="text-xs text-muted-foreground mt-1">Email is linked to your account and cannot be changed here.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                    <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" className="rounded-xl mt-1.5 h-11" value={profile.date_of_birth} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <Label>Marital Status</Label>
                  <Select value={profile.marital_status} onValueChange={(v) => setProfile({ ...profile, marital_status: v })}>
                    <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Religion</Label>
                  <Select value={profile.religion} onValueChange={(v) => setProfile({ ...profile, religion: v })}>
                    <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="islam">Islam</SelectItem>
                      <SelectItem value="hinduism">Hinduism</SelectItem>
                      <SelectItem value="buddhism">Buddhism</SelectItem>
                      <SelectItem value="christianity">Christianity</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.nationality} onChange={(e) => setProfile({ ...profile, nationality: e.target.value })} />
                </div>
                <div>
                  <Label>National ID No.</Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.national_id_no} onChange={(e) => setProfile({ ...profile, national_id_no: e.target.value })} placeholder="NID number" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Height</Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.height} onChange={(e) => setProfile({ ...profile, height: e.target.value })} placeholder={'e.g. 5\'8"'} />
                </div>
                <div>
                  <Label>Weight</Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.weight} onChange={(e) => setProfile({ ...profile, weight: e.target.value })} placeholder="e.g. 70kg" />
                </div>
              </div>



              {/* Address */}
              <div className="space-y-3 pt-2 border-t border-border/60">
                <Label className="font-semibold text-base">Present Address</Label>
                <div>
                  <Label>City (Thana / Upazila)</Label>
                  <Select
                    value={userProfile.area_id}
                    onValueChange={(v) => {
                      const area = areas.find(a => a.id === v);
                      setUserProfile({ ...userProfile, area_id: v, district_id: area?.district_id || '' });
                    }}
                  >
                    <SelectTrigger className="rounded-xl mt-1.5 h-11">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas
                        .map(a => {
                          const dist = districts.find(d => d.id === a.district_id);
                          return { id: a.id, label: dist ? `${a.name_en} (${dist.name_en})` : a.name_en };
                        })
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea className="rounded-xl" value={profile.present_address} onChange={(e) => setProfile({ ...profile, present_address: e.target.value })} placeholder="House/Road/Village details..." rows={2} />
              </div>

              <div className="space-y-3">
                <Label className="font-semibold text-base">Permanent Address</Label>
                <Textarea className="rounded-xl" value={profile.permanent_address} onChange={(e) => setProfile({ ...profile, permanent_address: e.target.value })} placeholder="Your permanent address details..." rows={2} />
              </div>

              <p className="text-xs text-muted-foreground pt-2">* Required fields. Other tabs let you add education, experience, subjects, family info, and media.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDUCATION TAB */}
        <TabsContent value="education" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Education Summary</h3>
                <p className="text-sm text-muted-foreground mb-3">Quick summary of your education background.</p>
                <Textarea className="rounded-xl" value={profile.education} onChange={(e) => setProfile({ ...profile, education: e.target.value })} placeholder="e.g., BSc in Physics from Dhaka University" rows={2} />
              </div>

              <div className="border-t border-border/60 pt-6">
                <h3 className="font-semibold mb-1">Educational Qualifications</h3>
                <p className="text-sm text-muted-foreground mb-4">Fill in each level you have completed. Leave blank if not applicable.</p>

                {educationEntries.map((entry, index) => {
                  const labels: Record<string, { title: string; subtitle: string; institutionPlaceholder: string }> = {
                    SSC: { title: 'Secondary School Certificate (SSC)', subtitle: 'Class 10 / O-Level equivalent', institutionPlaceholder: 'e.g., Govt. Laboratory High School' },
                    HSC: { title: 'Higher Secondary Certificate (HSC)', subtitle: 'Class 12 / A-Level equivalent', institutionPlaceholder: 'e.g., Notre Dame College' },
                    Bachelor: { title: 'Bachelor Degree', subtitle: 'Undergraduate (BSc, BA, BBA, etc.)', institutionPlaceholder: 'e.g., University of Dhaka' },
                    Masters: { title: 'Masters Degree', subtitle: 'Postgraduate (MSc, MA, MBA, etc.)', institutionPlaceholder: 'e.g., BUET' },
                  };
                  const meta = labels[entry.degree] || { title: entry.degree, subtitle: '', institutionPlaceholder: '' };
                  return (
                    <div key={entry.degree} className="p-4 border border-border rounded-xl space-y-4 mb-4 bg-muted/20">
                      <div>
                        <h4 className="font-semibold text-sm">{meta.title}</h4>
                        <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Institution Name</Label>
                          {entry.degree === 'Bachelor' || entry.degree === 'Masters' ? (
                            <div className="mt-1.5 space-y-1.5">
                              {manualInstitution[entry.degree] ? (
                                <Input
                                  className="rounded-xl h-11"
                                  value={entry.institution}
                                  onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                  placeholder="Type your institution name"
                                />
                              ) : (
                                <SearchableSelect
                                  options={UNIVERSITY_OPTIONS}
                                  value={entry.institution}
                                  onValueChange={(v) => updateEducation(index, 'institution', v)}
                                  placeholder={meta.institutionPlaceholder || 'Select university'}
                                  searchPlaceholder="Search universities..."
                                  emptyText="No university found."
                                  grouped
                                  className="h-11 rounded-xl"
                                />
                              )}
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() => {
                                  setManualInstitution(prev => {
                                    const next = { ...prev, [entry.degree]: !prev[entry.degree] };
                                    return next;
                                  });
                                  updateEducation(index, 'institution', '');
                                }}
                              >
                                {manualInstitution[entry.degree] ? '← Choose from list instead' : "Can't find your institution? Enter manually"}
                              </button>
                            </div>
                          ) : (
                            <Input className="rounded-xl mt-1.5 h-11" value={entry.institution} onChange={(e) => updateEducation(index, 'institution', e.target.value)} placeholder={meta.institutionPlaceholder} />
                          )}
                        </div>
                        {(entry.degree === 'SSC' || entry.degree === 'HSC') && (
                          <div>
                            <Label>Medium</Label>
                            <Select value={entry.medium || ''} onValueChange={(v) => updateEducation(index, 'medium', v)}>
                              <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue placeholder="Select medium" /></SelectTrigger>
                              <SelectContent>
                                {['Bangla Medium', 'English Medium', 'English Version', 'Madrasa Medium'].map(m => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label>{entry.degree === 'SSC' || entry.degree === 'HSC' ? 'Background' : 'Field of Study'}</Label>
                          {entry.degree === 'SSC' || entry.degree === 'HSC' ? (
                            <Select value={entry.field_of_study || ''} onValueChange={(v) => updateEducation(index, 'field_of_study', v)}>
                              <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue placeholder="Select background" /></SelectTrigger>
                              <SelectContent>
                                {['Science', 'Arts', 'Commerce', 'Vocational', 'Madrasah'].map(g => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input className="rounded-xl mt-1.5 h-11" value={entry.field_of_study} onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)} placeholder="e.g., Physics, CSE" />
                          )}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Passing Year</Label>
                          <Select value={entry.passing_year ? String(entry.passing_year) : ''} onValueChange={(v) => updateEducation(index, 'passing_year', v ? parseInt(v) : null)}>
                            <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue placeholder="Select year" /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() + 2 - i).map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Result / GPA / CGPA</Label>
                          <Input className="rounded-xl mt-1.5 h-11" value={entry.result} onChange={(e) => updateEducation(index, 'result', e.target.value)} placeholder="e.g., 5.00 / 3.85" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`edu-current-${index}`} checked={entry.is_current} onCheckedChange={(checked) => updateEducation(index, 'is_current', !!checked)} />
                        <Label htmlFor={`edu-current-${index}`} className="text-sm">Currently studying / ongoing</Label>
                      </div>
                      {entry.is_current && (entry.degree === 'Bachelor' || entry.degree === 'Masters') && (
                        <div>
                          <Label>Current Semester / Year <span className="text-destructive">*</span></Label>
                          <Input
                            className="rounded-xl mt-1.5 h-11"
                            value={entry.current_semester}
                            onChange={(e) => updateEducation(index, 'current_semester', e.target.value)}
                            placeholder={entry.degree === 'Bachelor' ? 'e.g., 3rd Year / 5th Semester' : 'e.g., 1st Year / 2nd Semester'}
                            maxLength={50}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Required since you are currently studying.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPERIENCE TAB */}
        <TabsContent value="experience" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4" /> Job Experience</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your work experience including tutoring and other jobs.</p>
              </div>

              {jobExperiences.map((entry, index) => (
                <div key={index} className="p-4 border border-border rounded-xl space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground">Experience #{index + 1}</h4>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeJobExperience(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {(() => {
                    const MEDIUMS = ['Bangla', 'English Medium', 'English Version', 'Madrasah'];
                    const allClassItems = CLASS_LEVELS.flatMap(g => g.items);
                    const selectedClasses = (entry.company || '').split(',').map(s => s.trim()).filter(Boolean);
                    const toggleClass = (item: string) => {
                      const next = selectedClasses.includes(item)
                        ? selectedClasses.filter(c => c !== item)
                        : [...selectedClasses, item];
                      updateJobExperience(index, 'company', next.join(', '));
                    };
                    return (
                      <>
                        <div>
                          <Label>Classes Taught *</Label>
                          <p className="text-xs text-muted-foreground mt-1">Select all classes you taught at this position.</p>
                          <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto p-2 border border-border rounded-xl bg-background">
                            {allClassItems.map(item => (
                              <Badge
                                key={item}
                                variant={selectedClasses.includes(item) ? 'default' : 'outline'}
                                className="cursor-pointer rounded-full px-3 py-1"
                                onClick={() => toggleClass(item)}
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>Medium *</Label>
                          <Select value={entry.designation || ''} onValueChange={(v) => updateJobExperience(index, 'designation', v)}>
                            <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue placeholder="Select medium" /></SelectTrigger>
                            <SelectContent>
                              {MEDIUMS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    );
                  })()}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" className="rounded-xl mt-1.5 h-11" value={entry.start_date} onChange={(e) => updateJobExperience(index, 'start_date', e.target.value)} />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" className="rounded-xl mt-1.5 h-11" value={entry.end_date} onChange={(e) => updateJobExperience(index, 'end_date', e.target.value)} disabled={entry.is_current} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id={`job-current-${index}`} checked={entry.is_current} onCheckedChange={(checked) => {
                      updateJobExperience(index, 'is_current', !!checked);
                      if (checked) updateJobExperience(index, 'end_date', '');
                    }} />
                    <Label htmlFor={`job-current-${index}`} className="text-sm">Currently working here</Label>
                  </div>
                  <div>
                    <Label>Responsibilities</Label>
                    <Textarea className="rounded-xl mt-1.5" value={entry.responsibilities} onChange={(e) => updateJobExperience(index, 'responsibilities', e.target.value)} placeholder="Describe your key responsibilities and achievements..." rows={3} />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addJobExperience} className="w-full rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Add Job Experience
              </Button>

              <div className="border-t border-border/60 pt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Total Years of Experience</Label>
                  <Input type="number" className="rounded-xl mt-1.5 h-11" value={profile.experience_years} onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBJECTS & CLASSES TAB */}
        <TabsContent value="subjects" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Subjects You Teach</h3>
                <p className="text-sm text-muted-foreground mb-3">Tap to select. You can pick multiple subjects.</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map(subject => (
                    <Badge
                      key={subject.id}
                      variant={selectedSubjects.includes(subject.id) ? 'default' : 'outline'}
                      className="cursor-pointer rounded-full px-3 py-1.5"
                      onClick={() => {
                        if (selectedSubjects.includes(subject.id)) {
                          setSelectedSubjects(selectedSubjects.filter(s => s !== subject.id));
                        } else {
                          setSelectedSubjects([...selectedSubjects, subject.id]);
                        }
                      }}
                    >
                      {subject.name_en}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/60 pt-6">
                <h3 className="font-semibold mb-1">Class Levels You Teach</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose all levels you're comfortable teaching.</p>
                <div className="space-y-4">
                  {CLASS_LEVELS.map(group => (
                    <div key={group.group}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{group.group}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(level => (
                          <Badge
                            key={level}
                            variant={selectedClassLevels.includes(level) ? 'default' : 'outline'}
                            className="cursor-pointer rounded-full px-3 py-1.5"
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
        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Teaching Preferences</h3>
                <p className="text-sm text-muted-foreground mb-4">How and what you'd like to charge.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Teaching Mode</Label>
                  <Select value={profile.teaching_mode} onValueChange={(v) => setProfile({ ...profile, teaching_mode: v })}>
                    <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In-Person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Salary (৳/month)</Label>
                  <Input type="number" className="rounded-xl mt-1.5 h-11" value={profile.monthly_salary_min} onChange={(e) => setProfile({ ...profile, monthly_salary_min: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Max Salary (৳/month)</Label>
                  <Input type="number" className="rounded-xl mt-1.5 h-11" value={profile.monthly_salary_max} onChange={(e) => setProfile({ ...profile, monthly_salary_max: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer">
                  <Checkbox checked={profile.is_available} onCheckedChange={(checked) => setProfile({ ...profile, is_available: !!checked })} />
                  <span className="text-sm">Available for new students</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer">
                  <Checkbox checked={profile.is_student} onCheckedChange={(checked) => setProfile({ ...profile, is_student: !!checked })} />
                  <span className="text-sm">I am currently a student</span>
                </label>
              </div>

              {/* Weekly Availability Calendar */}
              <div className="pt-4">
                <h3 className="font-semibold flex items-center gap-2 mb-3"><Calendar className="h-4 w-4" /> Weekly Availability</h3>
                <p className="text-sm text-muted-foreground mb-4">Click time slots to mark when you're available to teach.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Day</th>
                        {['Morning', 'Afternoon', 'Evening'].map(slot => (
                          <th key={slot} className="p-2 text-center text-xs font-medium text-muted-foreground">{slot}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                        <tr key={day} className="border-t border-border/40">
                          <td className="p-2 text-xs font-medium">{day}</td>
                          {['morning', 'afternoon', 'evening'].map(slot => {
                            const isActive = (profile.weekly_availability[day] || []).includes(slot);
                            return (
                              <td key={slot} className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = profile.weekly_availability[day] || [];
                                    const updated = isActive
                                      ? current.filter((s: string) => s !== slot)
                                      : [...current, slot];
                                    setProfile({
                                      ...profile,
                                      weekly_availability: {
                                        ...profile.weekly_availability,
                                        [day]: updated,
                                      },
                                    });
                                  }}
                                  className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                                    isActive
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  {isActive ? '✓' : '—'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAMILY TAB */}
        <TabsContent value="family" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Family & Emergency Contact</h3>
                <p className="text-sm text-muted-foreground mb-4">All fields below are required for verification and trust building.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Father's Name <span className="text-destructive">*</span></Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.father_name} onChange={(e) => setProfile({ ...profile, father_name: e.target.value })} placeholder="Father's full name" required />
                </div>
                <div>
                  <Label>Mother's Name <span className="text-destructive">*</span></Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.mother_name} onChange={(e) => setProfile({ ...profile, mother_name: e.target.value })} placeholder="Mother's full name" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Father's Phone <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5"><PhoneInput value={profile.father_phone} onChange={(v) => setProfile({ ...profile, father_phone: v })} /></div>
                </div>
                <div>
                  <Label>Mother's Phone <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5"><PhoneInput value={profile.mother_phone} onChange={(v) => setProfile({ ...profile, mother_phone: v })} /></div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Contact Name <span className="text-destructive">*</span></Label>
                  <Input className="rounded-xl mt-1.5 h-11" value={profile.emergency_contact_name} onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })} placeholder="e.g., Uncle, Guardian" required />
                </div>
                <div>
                  <Label>Emergency Contact Phone <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5"><PhoneInput value={profile.emergency_contact_phone} onChange={(v) => setProfile({ ...profile, emergency_contact_phone: v })} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEDIA / VERIFICATION / REVIEWS TAB */}
        <TabsContent value="media" className="space-y-6 mt-0">
          {/* All Documents (Identity + Verification) in one unified grid */}
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</h3>
                <p className="text-sm text-muted-foreground">Upload all required documents below. Files are private and only visible to admins.</p>
              </div>

              {/* Identity document type selector (compact) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                <Label className="text-sm whitespace-nowrap">Identity Document Type</Label>
                <Select value={idDocType} onValueChange={setIdDocType}>
                  <SelectTrigger className="rounded-lg h-9 sm:max-w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nid">NID Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose the type, then upload below.</p>
              </div>

              {/* Unified upload grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Identity tile */}
                {(() => {
                  const idLabel = idDocType === 'nid' ? 'NID Card' : idDocType === 'passport' ? 'Passport' : 'Birth Certificate';
                  const exists = !!idDocUrl;
                  return (
                    <div className={`border-2 border-dashed rounded-2xl p-4 text-center ${exists ? 'border-success/50 bg-success/5' : 'border-border'}`}>
                      <Upload className={`h-7 w-7 mx-auto mb-2 ${exists ? 'text-success' : 'text-muted-foreground'}`} />
                      <p className="font-medium text-sm">
                        {idLabel} <span className="text-destructive">*</span>
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {exists ? (idDocUploadedAt ? new Date(idDocUploadedAt).toLocaleDateString() : 'Uploaded') : 'JPG, PNG, WEBP, PDF (max 10MB)'}
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" disabled={idDocUploading} asChild className="rounded-lg">
                            <span>{exists ? 'Replace' : 'Upload'}</span>
                          </Button>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleIdDocUpload}
                            disabled={idDocUploading}
                          />
                        </label>
                        {exists && (
                          <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={handleViewIdDoc}>
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Verification document tiles */}
                {(profile.is_student
                  ? ['university_id_card', 'university_payslip']
                  : ['education_certificate', 'experience_certificate']
                ).map((docType) => {
                  const doc = documents.find(d => d.document_type === docType);
                  const exists = !!doc;
                  const labelMap: Record<string, string> = {
                    university_id_card: 'University ID Card',
                    university_payslip: 'University Payslip',
                    education_certificate: 'Education Certificate',
                    experience_certificate: 'Experience Certificate',
                  };
                  const label = labelMap[docType] || docType.replace(/_/g, ' ');
                  const isRequired = profile.is_student
                    ? (docType === 'university_id_card' || docType === 'university_payslip')
                    : (docType === 'education_certificate');
                  return (
                    <div key={docType} className={`border-2 border-dashed rounded-2xl p-4 text-center ${exists ? 'border-success/50 bg-success/5' : 'border-border'}`}>
                      <Upload className={`h-7 w-7 mx-auto mb-2 ${exists ? 'text-success' : 'text-muted-foreground'}`} />
                      <p className="font-medium text-sm">
                        {label}
                        {isRequired && <span className="text-destructive ml-1">*</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {exists ? 'Uploaded' : 'PDF, JPG, PNG (max 5MB)'}
                      </p>
                      {exists && doc && (
                        <div className="flex items-center justify-center mb-2">
                          {getStatusBadge(doc.status)}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" disabled={uploading} asChild className="rounded-lg">
                            <span>{exists ? 'Replace' : 'Upload'}</span>
                          </Button>
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(e, docType)} disabled={uploading} />
                        </label>
                        {exists && doc && (
                          <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => handleViewDoc(doc.document_url)}>
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(uploading || idDocUploading) && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 animate-pulse" /> Uploading...
                </p>
              )}

              <div className="flex items-start gap-2 p-3 bg-info/10 rounded-xl text-info">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-xs opacity-90">
                  <span className="font-medium">Required:</span> Identity document is mandatory.{' '}
                  {profile.is_student
                    ? 'Students must upload a University ID Card or Payslip.'
                    : 'Non-students must upload an Education Certificate. Experience Certificate is optional but recommended.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Video Introduction */}
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Video className="h-4 w-4" /> Video Introduction</h3>
                <p className="text-sm text-muted-foreground mb-2">Share a 30-second YouTube or Vimeo video showing your communication skills.</p>
              </div>
              <Input className="rounded-xl h-11" value={profile.video_url} onChange={(e) => setProfile({ ...profile, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..." />
              {profile.video_url && getVideoEmbedUrl(profile.video_url) && (
                <div className="aspect-video rounded-2xl overflow-hidden border">
                  <iframe src={getVideoEmbedUrl(profile.video_url)!} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Video Introduction" />
                </div>
              )}
              {profile.video_url && !getVideoEmbedUrl(profile.video_url) && (
                <p className="text-sm text-destructive">Please enter a valid YouTube or Vimeo URL</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom save row for convenience */}
      <div className="flex justify-end gap-3 mt-8">
        <Link to="/dashboard">
          <Button variant="outline" className="rounded-xl">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  if (isAdminEdit) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <Logo size="md" />
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/admin">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto">{profileContent}</main>
      </div>
    );
  }

  return (
    <TutorSidebarLayout title="Edit Profile">
      {profileContent}
    </TutorSidebarLayout>
  );
}
