import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Eye, TrendingUp, CheckCircle2, XCircle, DollarSign } from 'lucide-react';

interface WeeklyViews {
  label: string;
  count: number;
}

export default function TutorAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [weeklyViews, setWeeklyViews] = useState<WeeklyViews[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [stats, setStats] = useState({
    totalApplications: 0,
    shortlisted: 0,
    accepted: 0,
    rejected: 0,
    totalEarnings: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (user) fetchAnalytics();
  }, [user, authLoading]);

  const fetchAnalytics = async () => {
    if (!user) return;

    // Get tutor profile
    const { data: tp } = await supabase
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!tp) { setLoading(false); return; }

    // Profile views — last 8 weeks
    const weeks: WeeklyViews[] = [];
    let total = 0;
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const label = start.toLocaleDateString('en', { month: 'short', day: 'numeric' });

      const { count } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', tp.id)
        .gte('viewed_at', start.toISOString())
        .lt('viewed_at', end.toISOString());

      const c = count || 0;
      total += c;
      weeks.push({ label, count: c });
    }
    setWeeklyViews(weeks);
    setTotalViews(total);

    // Applications stats
    const { data: apps } = await supabase
      .from('applications')
      .select('status, proposed_rate')
      .eq('tutor_id', tp.id);

    if (apps) {
      setStats({
        totalApplications: apps.length,
        shortlisted: apps.filter(a => a.status === 'shortlisted').length,
        accepted: apps.filter(a => a.status === 'accepted').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        totalEarnings: apps
          .filter(a => a.status === 'accepted')
          .reduce((sum, a) => sum + (a.proposed_rate || 0), 0),
      });
    }

    setLoading(false);
  };

  const maxViews = Math.max(...weeklyViews.map(w => w.count), 1);

  const conversionRate = stats.totalApplications > 0
    ? ((stats.accepted / stats.totalApplications) * 100).toFixed(1)
    : '0';

  const shortlistRate = stats.totalApplications > 0
    ? ((stats.shortlisted / stats.totalApplications) * 100).toFixed(1)
    : '0';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TutorSidebarLayout title="Analytics">
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Performance Analytics
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Views</p>
              <p className="text-xl font-bold">{totalViews}</p>
              <p className="text-[10px] text-muted-foreground">last 8 weeks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Hire Rate</p>
              <p className="text-xl font-bold text-success">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">{stats.accepted}/{stats.totalApplications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Shortlist Rate</p>
              <p className="text-xl font-bold text-primary">{shortlistRate}%</p>
              <p className="text-[10px] text-muted-foreground">{stats.shortlisted}/{stats.totalApplications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Earnings</p>
              <p className="text-xl font-bold">৳{stats.totalEarnings.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">from accepted</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" /> Profile Views — Last 8 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {weeklyViews.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{w.count}</span>
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{ height: `${Math.max((w.count / maxViews) * 120, 4)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">{w.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Application Funnel
            </CardTitle>
            <CardDescription>How your applications convert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Applied', value: stats.totalApplications, color: 'bg-primary', icon: BarChart3 },
                { label: 'Shortlisted', value: stats.shortlisted, color: 'bg-amber-500', icon: TrendingUp },
                { label: 'Accepted', value: stats.accepted, color: 'bg-success', icon: CheckCircle2 },
                { label: 'Rejected', value: stats.rejected, color: 'bg-destructive', icon: XCircle },
              ].map(item => {
                const pct = stats.totalApplications > 0 ? (item.value / stats.totalApplications) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium flex items-center gap-1.5">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                    <div className="flex-1 bg-muted/50 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        {pct > 15 && <span className="text-[10px] text-white font-medium">{item.value}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold w-10 text-right">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-2">💡 Tips to Improve</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {totalViews < 10 && <li>• Your profile has low views. Try boosting your profile for more visibility.</li>}
              {stats.totalApplications === 0 && <li>• Start applying to jobs to build your application history.</li>}
              {stats.totalApplications > 5 && stats.accepted === 0 && (
                <li>• Consider updating your bio and adding a video introduction to improve your hire rate.</li>
              )}
              {conversionRate !== '0' && Number(conversionRate) > 0 && (
                <li>• Great work! Your hire rate is {conversionRate}%. Keep applying to maintain momentum.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
