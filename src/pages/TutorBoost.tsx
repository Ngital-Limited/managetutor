import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeaturedListing {
  id: string;
  end_date: string;
  is_active: boolean;
  amount_paid: number;
}

export default function TutorBoost() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; phone: string | null } | null>(null);
  const [active, setActive] = useState<FeaturedListing | null>(null);
  const [boostPrice, setBoostPrice] = useState<number>(500);
  const [boostLoading, setBoostLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      load();
    }
  }, [user, authLoading]);

  useEffect(() => {
    supabase.from('platform_settings').select('value').eq('key', 'featured_tutor_price').maybeSingle()
      .then(({ data }) => {
        const n = Number(data?.value);
        if (Number.isFinite(n) && n >= 0) setBoostPrice(n);
      });
  }, []);

  const load = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single();
    if (prof) setUserProfile(prof);
    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!tutorData) return;
    setTutorId(tutorData.id);
    const { data: featured } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('tutor_id', tutorData.id)
      .eq('is_active', true)
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (featured) setActive(featured as FeaturedListing);
  };

  const handleBoost = async () => {
    if (!user || !tutorId || !userProfile) return;
    setBoostLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sslcommerz-init', {
        body: {
          amount: boostPrice,
          productName: 'Featured Tutor Profile (30 days)',
          productCategory: 'Featured Listing',
          customerName: userProfile.full_name,
          customerEmail: user.email,
          customerPhone: userProfile.phone || '01700000000',
          userId: user.id,
          listingType: 'tutor_profile',
        },
      });
      if (error) throw error;
      if (data?.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        throw new Error('No gateway URL returned');
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBoostLoading(false);
    }
  };

  return (
    <TutorSidebarLayout title="Boost Your Profile">
      <div className="container max-w-[1200px] px-4 md:px-6 py-6">
        <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Boost Your Profile
            </CardTitle>
            <CardDescription>Get featured at the top of search results for 30 days and attract more students</CardDescription>
          </CardHeader>
          <CardContent>
            {active ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                <Crown className="h-8 w-8 text-accent" />
                <div className="flex-1">
                  <p className="font-bold text-accent">Your profile is currently boosted!</p>
                  <p className="text-sm text-muted-foreground">
                    Active until {new Date(active.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <Badge className="bg-accent text-accent-foreground"><Zap className="h-3 w-3 mr-1" />Active</Badge>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-lg bg-card border">
                <Sparkles className="h-10 w-10 text-accent flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-xl">৳{boostPrice} <span className="text-sm font-normal text-muted-foreground">/ 30 days</span></p>
                  <p className="text-sm text-muted-foreground">
                    Featured at the top of search results, marked with a "Featured" badge, and shown to more parents.
                  </p>
                </div>
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={boostLoading} onClick={handleBoost}>
                  <Zap className="h-4 w-4 mr-1" />
                  {boostLoading ? 'Processing...' : `Pay ৳${boostPrice} & Boost`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
