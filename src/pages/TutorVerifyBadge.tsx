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
  const [profile, setProfile] = useState<{ verification_status: string; verification_paid: boolean } | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  const [verificationFee, setVerificationFee] = useState<number>(50);
  const [loading, setLoading] = useState(false);

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
      .select('verification_status, verification_paid')
      .eq('user_id', user.id)
      .single();
    if (tutorData) setProfile(tutorData as any);
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
      </div>
    </TutorSidebarLayout>
  );
}
