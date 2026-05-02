import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, subDays } from 'date-fns';
import {
  UserPlus, Briefcase, FileText, CreditCard, CheckCircle2, ShieldCheck,
  DollarSign, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Eye, Users, GraduationCap, RefreshCw
} from 'lucide-react';

interface TodayMetric {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  category: 'activity' | 'revenue' | 'pending';
}

interface Props {
  onNavigate: (tab: string) => void;
}

export function AdminCommandCenter({ onNavigate }: Props) {
  const [metrics, setMetrics] = useState<TodayMetric[]>([]);
  const [yesterdayMetrics, setYesterdayMetrics] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueWeek, setRevenueWeek] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [commissionDue, setCommissionDue] = useState(0);
  const [commissionOverdue, setCommissionOverdue] = useState(0);

  const fetchTodayMetrics = useCallback(async () => {
    setLoading(true);
    const todayStart = startOfDay(new Date()).toISOString();
    const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();
    const weekStart = startOfDay(subDays(new Date(), 7)).toISOString();
    const monthStart = startOfDay(subDays(new Date(), 30)).toISOString();

    const [
      { count: newGuardians },
      { count: newTutors },
      { count: jobsPosted },
      { count: appsSubmitted },
      { count: hiresConfirmed },
      { count: pendingVerifications },
      { count: pendingJobs },
      { count: pendingUsers },
      { data: todayPayments },
      { data: weekPayments },
      { data: monthPayments },
      { data: commDueData },
      { data: commOverdueData },
      // Yesterday comparisons
      { count: yGuardians },
      { count: yTutors },
      { count: yJobs },
      { count: yApps },
      { count: yHires },
    ] = await Promise.all([
      // Today's activity
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'parent').gte('created_at', todayStart),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'tutor').gte('created_at', todayStart),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('applications').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('hiring_confirmations').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      // Pending
      supabase.from('tutor_profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval' as any),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      // Revenue
      supabase.from('payment_transactions').select('amount').eq('status', 'completed').gte('created_at', todayStart),
      supabase.from('payment_transactions').select('amount').eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('payment_transactions').select('amount').eq('status', 'completed').gte('created_at', monthStart),
      // Commission
      supabase.from('commission_records').select('amount_due').eq('status', 'pending'),
      supabase.from('commission_records').select('amount_due').eq('status', 'overdue'),
      // Yesterday for comparison
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'parent').gte('created_at', yesterdayStart).lt('created_at', todayStart),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'tutor').gte('created_at', yesterdayStart).lt('created_at', todayStart),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).gte('created_at', yesterdayStart).lt('created_at', todayStart),
      supabase.from('applications').select('id', { count: 'exact', head: true }).gte('created_at', yesterdayStart).lt('created_at', todayStart),
      supabase.from('hiring_confirmations').select('id', { count: 'exact', head: true }).gte('created_at', yesterdayStart).lt('created_at', todayStart),
    ]);

    const sum = (rows: { amount: any }[] | null) => rows?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;
    const sumDue = (rows: { amount_due: any }[] | null) => rows?.reduce((s, r) => s + Number(r.amount_due || 0), 0) || 0;

    setRevenueToday(sum(todayPayments));
    setRevenueWeek(sum(weekPayments));
    setRevenueMonth(sum(monthPayments));
    setCommissionDue(sumDue(commDueData));
    setCommissionOverdue(sumDue(commOverdueData));

    setYesterdayMetrics(new Map([
      ['Guardian Signups', yGuardians || 0],
      ['Tutor Signups', yTutors || 0],
      ['Jobs Posted', yJobs || 0],
      ['Applications', yApps || 0],
      ['Hires Confirmed', yHires || 0],
    ]));

    setMetrics([
      { label: 'Guardian Signups', value: newGuardians || 0, icon: Users, color: 'text-blue-500', category: 'activity' },
      { label: 'Tutor Signups', value: newTutors || 0, icon: GraduationCap, color: 'text-green-500', category: 'activity' },
      { label: 'Jobs Posted', value: jobsPosted || 0, icon: Briefcase, color: 'text-purple-500', category: 'activity' },
      { label: 'Applications', value: appsSubmitted || 0, icon: FileText, color: 'text-orange-500', category: 'activity' },
      { label: 'Hires Confirmed', value: hiresConfirmed || 0, icon: CheckCircle2, color: 'text-emerald-500', category: 'activity' },
      { label: 'Pending Verifications', value: pendingVerifications || 0, icon: ShieldCheck, color: 'text-warning', category: 'pending' },
      { label: 'Pending Jobs', value: pendingJobs || 0, icon: Clock, color: 'text-warning', category: 'pending' },
      { label: 'Pending Users', value: pendingUsers || 0, icon: UserPlus, color: 'text-warning', category: 'pending' },
    ]);

    setLoading(false);
  }, []);

  useEffect(() => { fetchTodayMetrics(); }, [fetchTodayMetrics]);

  const TrendBadge = ({ current, label }: { current: number; label: string }) => {
    const yesterday = yesterdayMetrics.get(label) ?? 0;
    if (yesterday === 0 && current === 0) return null;
    const diff = current - yesterday;
    if (diff === 0) return <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-2.5 w-2.5" /> same</span>;
    const up = diff > 0;
    return (
      <span className={`flex items-center gap-0.5 text-[10px] ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
        {up ? '+' : ''}{diff} vs yesterday
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activityMetrics = metrics.filter(m => m.category === 'activity');
  const pendingMetrics = metrics.filter(m => m.category === 'pending');

  return (
    <div className="space-y-5">
      {/* Today's Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's Activity</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={fetchTodayMetrics}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {activityMetrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border/50 p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5">
                <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                <span className="text-[11px] text-muted-foreground truncate">{m.label}</span>
              </div>
              <div className="text-xl font-bold">{m.value}</div>
              <TrendBadge current={m.value} label={m.label} />
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border/50 p-3 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="text-[11px] text-muted-foreground">Today's Revenue</span>
          </div>
          <div className="text-lg font-bold text-green-700 dark:text-green-400">৳{revenueToday.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-border/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">This Week</span>
          </div>
          <div className="text-lg font-bold">৳{revenueWeek.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-border/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">This Month</span>
          </div>
          <div className="text-lg font-bold">৳{revenueMonth.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-border/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[11px] text-muted-foreground">Commission Due</span>
          </div>
          <div className="text-lg font-bold">৳{(commissionDue + commissionOverdue).toLocaleString()}</div>
          {commissionOverdue > 0 && (
            <span className="text-[10px] text-destructive font-medium">৳{commissionOverdue.toLocaleString()} overdue</span>
          )}
        </div>
      </div>

      {/* Pending Action Items */}
      {pendingMetrics.some(m => m.value > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingMetrics.filter(m => m.value > 0).map((m) => {
            const tabMap: Record<string, string> = {
              'Pending Verifications': 'verifications',
              'Pending Jobs': 'jobs',
              'Pending Users': 'users',
            };
            return (
              <button
                key={m.label}
                onClick={() => onNavigate(tabMap[m.label] || 'overview')}
                className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm hover:bg-warning/10 transition-colors"
              >
                <m.icon className="h-3.5 w-3.5 text-warning" />
                <span className="font-medium">{m.value}</span>
                <span className="text-muted-foreground">{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
