import { useState, useEffect } from 'react';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Gift, Trophy, Star, Award, Target, BookOpen, Shield, Zap } from 'lucide-react';

const BADGE_DEFINITIONS = [
  { type: 'profile_complete', name: 'Profile Pro', icon: Star, description: 'Complete your profile to 100%', color: 'text-yellow-500' },
  { type: 'first_application', name: 'Go-Getter', icon: Target, description: 'Submit your first job application', color: 'text-blue-500' },
  { type: 'five_applications', name: 'Active Applicant', icon: BookOpen, description: 'Apply to 5 jobs', color: 'text-green-500' },
  { type: 'first_hire', name: 'First Hire', icon: Trophy, description: 'Get accepted for your first job', color: 'text-purple-500' },
  { type: 'verified', name: 'Verified Tutor', icon: Shield, description: 'Get your profile verified', color: 'text-blue-600' },
  { type: 'five_referrals', name: 'Super Referrer', icon: Users, description: 'Refer 5 people to the platform', color: 'text-orange-500' },
  { type: 'boosted', name: 'Spotlight', icon: Zap, description: 'Boost your profile at least once', color: 'text-pink-500' },
  { type: 'ten_sessions', name: 'Dedicated Tutor', icon: Award, description: 'Log 10 class sessions', color: 'text-emerald-500' },
];

export default function TutorReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ total_referrals: 0, total_earnings: 0 });
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch or create referral code
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      setReferralCode(existing.referral_code);
      setReferralStats({ total_referrals: existing.total_referrals, total_earnings: existing.total_earnings });
    } else {
      const code = 'MT-' + user.id.slice(0, 6).toUpperCase();
      const { data: created } = await supabase
        .from('referral_codes')
        .insert({ user_id: user.id, referral_code: code })
        .select()
        .single();
      if (created) {
        setReferralCode(created.referral_code);
      }
    }

    // Fetch badges
    const { data: badges } = await supabase
      .from('tutor_badges')
      .select('badge_type')
      .eq('user_id', user.id);
    setEarnedBadges((badges || []).map(b => b.badge_type));

    setLoading(false);
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
  };

  if (loading) {
    return (
      <TutorSidebarLayout title="Referrals & Badges">
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      </TutorSidebarLayout>
    );
  }

  return (
    <TutorSidebarLayout title="Referrals & Badges">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Referral Program */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-primary" /> Referral Program
            </CardTitle>
            <CardDescription>Invite tutors & parents. Earn rewards when they join and get active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-primary">{referralStats.total_referrals}</p>
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                </CardContent>
              </Card>
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold text-green-600">৳{referralStats.total_earnings}</p>
                  <p className="text-xs text-muted-foreground">Earnings from Referrals</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background rounded px-3 py-2 text-sm font-mono border">{referralCode}</code>
                <Button variant="outline" size="sm" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button variant="secondary" size="sm" className="w-full" onClick={copyLink}>Copy Referral Link</Button>
            </div>
          </CardContent>
        </Card>

        {/* Gamification Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-primary" /> Achievement Badges
            </CardTitle>
            <CardDescription>
              {earnedBadges.length}/{BADGE_DEFINITIONS.length} badges earned
            </CardDescription>
            <Progress value={(earnedBadges.length / BADGE_DEFINITIONS.length) * 100} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BADGE_DEFINITIONS.map(badge => {
                const earned = earnedBadges.includes(badge.type);
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.type}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${earned ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border opacity-60'}`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${earned ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${earned ? badge.color : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-1">
                        {badge.name}
                        {earned && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-700">Earned</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
