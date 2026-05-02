import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Briefcase, DollarSign, Clock, CheckCircle2, UserCheck } from 'lucide-react';

interface KPI {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
}

export function AdminPerformanceKPIs() {
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
      const t30 = thirtyDaysAgo.toISOString();
      const t60 = sixtyDaysAgo.toISOString();

      const [
        { count: newUsers30 },
        { count: newUsers60 },
        { count: jobs30 },
        { count: jobs60 },
        { count: apps30 },
        { count: apps60 },
        { count: hires30 },
        { count: hires60 },
        { data: rev30 },
        { data: rev60 },
        { count: pendingV },
        { data: avgTime },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', t30),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', t60).lt('created_at', t30),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', t30),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', t60).lt('created_at', t30),
        supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', t30),
        supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', t60).lt('created_at', t30),
        supabase.from('hiring_confirmations').select('*', { count: 'exact', head: true }).gte('created_at', t30),
        supabase.from('hiring_confirmations').select('*', { count: 'exact', head: true }).gte('created_at', t60).lt('created_at', t30),
        supabase.from('payment_transactions').select('amount').eq('status', 'completed').gte('created_at', t30),
        supabase.from('payment_transactions').select('amount').eq('status', 'completed').gte('created_at', t60).lt('created_at', t30),
        supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('jobs').select('created_at, status').eq('status', 'completed').gte('created_at', t30).limit(100),
      ]);

      const calcChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      const revTotal30 = (rev30 || []).reduce((s, r) => s + (r.amount || 0), 0);
      const revTotal60 = (rev60 || []).reduce((s, r) => s + (r.amount || 0), 0);

      const convRate = (apps30 || 0) > 0 ? Math.round(((hires30 || 0) / (apps30 || 1)) * 100) : 0;
      const convRatePrev = (apps60 || 0) > 0 ? Math.round(((hires60 || 0) / (apps60 || 1)) * 100) : 0;

      setKPIs([
        { label: 'New Signups (30d)', value: newUsers30 || 0, change: calcChange(newUsers30 || 0, newUsers60 || 0), icon: Users, color: 'text-blue-600' },
        { label: 'Jobs Posted (30d)', value: jobs30 || 0, change: calcChange(jobs30 || 0, jobs60 || 0), icon: Briefcase, color: 'text-emerald-600' },
        { label: 'Applications (30d)', value: apps30 || 0, change: calcChange(apps30 || 0, apps60 || 0), icon: CheckCircle2, color: 'text-amber-600' },
        { label: 'Hires (30d)', value: hires30 || 0, change: calcChange(hires30 || 0, hires60 || 0), icon: UserCheck, color: 'text-purple-600' },
        { label: 'Revenue (30d)', value: `৳${revTotal30.toLocaleString()}`, change: calcChange(revTotal30, revTotal60), icon: DollarSign, color: 'text-green-600' },
        { label: 'Conversion Rate', value: `${convRate}%`, change: convRate - convRatePrev, icon: TrendingUp, color: 'text-cyan-600' },
        { label: 'Pending Verifications', value: pendingV || 0, icon: Clock, color: 'text-orange-600' },
      ]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 7 }).map((_, i) => <Card key={i}><CardContent className="pt-4 pb-3 h-20 animate-pulse bg-muted/30" /></Card>)}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(kpi => (
        <Card key={kpi.label} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-bold">{kpi.value}</span>
              {kpi.change !== undefined && (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${kpi.change >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
