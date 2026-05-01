import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { TrendingUp, Users, Briefcase, FileText, CheckCircle2, UserCheck } from 'lucide-react';

interface FunnelStage {
  label: string;
  count: number;
  icon: any;
  color: string;
}

export function AdminConversionFunnelTab() {
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; signups: number; profiles: number; applications: number; hires: number }[]>([]);

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    const since = subDays(new Date(), Number(period)).toISOString();

    try {
      const [
        { count: totalSignups },
        { count: tutorProfiles },
        { count: parentSignups },
        { count: jobsPosted },
        { count: applications },
        { count: shortlisted },
        { count: accepted },
        { count: hireCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'parent').gte('created_at', since),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'shortlisted').gte('created_at', since),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted').gte('created_at', since),
        supabase.from('commission_records' as any).select('*', { count: 'exact', head: true }).gte('created_at', since),
      ]);

      setStages([
        { label: 'Total Signups', count: totalSignups || 0, icon: Users, color: 'text-primary' },
        { label: 'Tutor Profiles', count: tutorProfiles || 0, icon: UserCheck, color: 'text-blue-500' },
        { label: 'Jobs Posted', count: jobsPosted || 0, icon: Briefcase, color: 'text-indigo-500' },
        { label: 'Applications', count: applications || 0, icon: FileText, color: 'text-purple-500' },
        { label: 'Shortlisted', count: shortlisted || 0, icon: TrendingUp, color: 'text-warning' },
        { label: 'Accepted', count: accepted || 0, icon: CheckCircle2, color: 'text-emerald-500' },
        { label: 'Hired (Commission)', count: hireCount || 0, icon: CheckCircle2, color: 'text-success' },
      ]);

      // Monthly trend for last 6 months
      const months: typeof monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date();
        start.setMonth(start.getMonth() - i, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const from = start.toISOString();
        const to = end.toISOString();

        const [s, p, a, h] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
          supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
          supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
          supabase.from('commission_records' as any).select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
        ]);
        months.push({
          month: format(start, 'MMM yyyy'),
          signups: s.count || 0,
          profiles: p.count || 0,
          applications: a.count || 0,
          hires: h.count || 0,
        });
      }
      setMonthlyData(months);
    } catch (err) {
      console.error('Funnel fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchFunnel(); }, [fetchFunnel]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Conversion Funnel</h1>
          <p className="text-sm text-muted-foreground">Track user journey from signup to hire</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading funnel data...</div>
      ) : (
        <>
          {/* Visual Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversion Stages</CardTitle>
              <CardDescription>Last {period} days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.map((stage, idx) => {
                const prevCount = idx > 0 ? stages[idx - 1].count : stage.count;
                const convRate = prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(1) : '—';
                const barWidth = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 4) : 4;
                const Icon = stage.icon;

                return (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${stage.color}`} />
                        <span className="font-medium">{stage.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{stage.count.toLocaleString()}</span>
                        {idx > 0 && (
                          <Badge variant="outline" className="text-[10px]">{convRate}%</Badge>
                        )}
                      </div>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Overall conversion */}
              {stages.length >= 2 && stages[0].count > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Overall Conversion (Signup → Hire)</p>
                  <p className="text-2xl font-bold text-primary">
                    {((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(2)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Trends (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Month</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Signups</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Tutor Profiles</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Applications</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Hires</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(m => (
                      <tr key={m.month} className="border-b border-border/50">
                        <td className="py-2 px-3 font-medium">{m.month}</td>
                        <td className="py-2 px-3 text-right">{m.signups}</td>
                        <td className="py-2 px-3 text-right">{m.profiles}</td>
                        <td className="py-2 px-3 text-right">{m.applications}</td>
                        <td className="py-2 px-3 text-right font-medium">{m.hires}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant="outline" className="text-[10px]">
                            {m.signups > 0 ? ((m.hires / m.signups) * 100).toFixed(1) : '0'}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
