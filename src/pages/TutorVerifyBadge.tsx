import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ShieldCheck, Upload, FileCheck2, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TutorVerifyBadge() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ verification_status: string; verification_paid: boolean; id_document_type: string | null; id_document_url: string | null; id_document_uploaded_at: string | null } | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  const [verificationFee, setVerificationFee] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState<string>('nid');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      load();
    }
  }, [user, authLoading]);

  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'verification_fee').maybeSingle()
      .then(({ data }) => {
        const n = Number(data?.value);
        if (Number.isFinite(n) && n >= 0) setVerificationFee(n);
      });
  }, []);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (prof) setUserProfile(prof);
    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('verification_status, verification_paid, id_document_type, id_document_url, id_document_uploaded_at')
      .eq('user_id', user.id)
      .single();
    if (tutorData) {
      setProfile(tutorData as any);
      if ((tutorData as any).id_document_type) setDocType((tutorData as any).id_document_type);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum size is 10MB.', variant: 'destructive' });
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Upload JPG, PNG, WEBP, or PDF.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('verification-documents')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from('tutor_profiles')
        .update({
          id_document_type: docType,
          id_document_url: path,
          id_document_uploaded_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (updErr) throw updErr;
      toast({ title: 'Document uploaded', description: 'Our team will review it shortly.' });
      await load();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleView = async () => {
    if (!profile?.id_document_url) return;
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(profile.id_document_url, 60);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handlePay = async () => {
    if (!user || !userProfile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sslcommerz-init', {
        body: {
          amount: verificationFee,
          productName: 'Verified Badge',
          productCategory: 'Verification',
          customerName: userProfile.full_name,
          customerEmail: user.email,
          customerPhone: '01700000000',
          userId: user.id,
          listingType: 'verification_badge',
        },
      });
      if (error) throw error;
      if (data?.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        throw new Error('No gateway URL returned');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Payment initiation failed', variant: 'destructive' });
    }
    setLoading(false);
  };

  const isVerified = profile?.verification_status === 'approved';

  return (
    <TutorSidebarLayout title="Verify Badge Payment">
      <div className="container max-w-[1200px] py-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Verified Badge
            </CardTitle>
            <CardDescription>
              Stand out with a verified badge on your profile. Parents trust verified tutors more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isVerified ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div className="flex-1">
                  <p className="font-bold text-success">You are verified!</p>
                  <p className="text-sm text-muted-foreground">Your profile shows a verified badge to parents.</p>
                </div>
                <Badge className="bg-success text-success-foreground">Verified</Badge>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-card border">
                <CheckCircle2 className="h-10 w-10 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">One-time fee: ৳{verificationFee}</p>
                  <p className="text-sm text-muted-foreground">
                    After payment, our team will review and approve your verified badge.
                  </p>
                </div>
                <Button onClick={handlePay} disabled={loading}>
                  {loading ? 'Processing...' : `Pay ৳${verificationFee} & Verify`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          Identity document upload (NID / Passport / Birth Certificate) has moved to your{' '}
          <a href="/tutor/profile" className="text-primary underline">Profile → Media → Verification Documents</a>.
        </p>
      </div>
    </TutorSidebarLayout>
  );
}
