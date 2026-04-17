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
  const [active, setActive] = useState<FeaturedListing | null>(null);
  const [boostLoading, setBoostLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      load();
    }
  }, [user, authLoading]);

  const load = async () => {
    if (!user) return;
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

  const handleBoost = async (days: number, price: number) => {
    if (!tutorId) return;
    setBoostLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      const { error } = await supabase.from('featured_listings').insert({
        tutor_id: tutorId,
        listing_type: 'tutor_profile',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        amount_paid: price,
        is_active: true,
      });
      if (error) throw error;
      await supabase.from('tutor_profiles').update({ is_featured: true }).eq('id', tutorId);
      toast({ title: 'Profile Boosted!', description: `Your profile is now featured for ${days} days.` });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBoostLoading(false);
    }
  };

  return (
    <TutorSidebarLayout title="Boost Your Profile">
      <div className="container max-w-[1200px] py-6">
        <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Boost Your Profile
            </CardTitle>
            <CardDescription>Get featured at the top of search results and attract more students</CardDescription>
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
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-primary">৳199</p>
                    <p className="text-sm text-muted-foreground mb-1">7 Days</p>
                    <p className="text-xs text-muted-foreground mb-4">~৳28/day</p>
                    <Button className="w-full" variant="outline" disabled={boostLoading} onClick={() => handleBoost(7, 199)}>
                      <Zap className="h-4 w-4 mr-1" />Boost 7 Days
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-accent shadow-md shadow-accent/10 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground px-3">Best Value</Badge>
                  </div>
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-accent">৳499</p>
                    <p className="text-sm text-muted-foreground mb-1">30 Days</p>
                    <p className="text-xs text-muted-foreground mb-4">~৳17/day</p>
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={boostLoading} onClick={() => handleBoost(30, 499)}>
                      <Sparkles className="h-4 w-4 mr-1" />Boost 30 Days
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-primary">৳1,299</p>
                    <p className="text-sm text-muted-foreground mb-1">90 Days</p>
                    <p className="text-xs text-muted-foreground mb-4">~৳14/day</p>
                    <Button className="w-full" variant="outline" disabled={boostLoading} onClick={() => handleBoost(90, 1299)}>
                      <Crown className="h-4 w-4 mr-1" />Boost 90 Days
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
