import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight, Briefcase, Users, Star, BookOpen, CheckCircle2,
  XCircle, Clock, TrendingUp, RefreshCw, ChevronRight, MapPin, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatExactDate } from '@/lib/date';

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  color: string;
  icon: React.ElementType;
}

interface PipelineJob {
  id: string;
  title: string;
  job_reference: string | null;
  status: string;
  created_at: string;
  district_name: string | null;
  parent_name: string | null;
  total_applications: number;
  stages: Record<string, number>;
}

export function AdminPipelineTab({ toast }: { toast: any }) {
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'7' | '30' | '90' | 'all'>('30');
  const [conversionRates, setConversionRates] = useState<{ label: string; rate: number }[]>([]);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      // Build date filter
      let dateFilter: string | null = null;
      if (periodFilter !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(periodFilter));
        dateFilter = d.toISOString();
      }

      // Fetch jobs
      let jobQuery = supabase
        .from('jobs')
        .select(`
          id, title, job_reference, status, created_at, parent_id, total_applications,
          districts ( name_en )
        `)
        .in('status', ['open', 'pending_approval', 'in_progress', 'completed', 'cancelled'] as any)
        .order('created_at', { ascending: false })
        .limit(500);

      if (dateFilter) {
        jobQuery = jobQuery.gte('created_at', dateFilter);
      }

      const { data: jobsData } = await jobQuery;
      if (!jobsData || jobsData.length === 0) {
        setFunnel([]);
        setJobs([]);
        setConversionRates([]);
        setLoading(false);
        return;
      }

      const jobIds = jobsData.map((j: any) => j.id);

      // Fetch all applications for these jobs
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, job_id, status')
        .in('job_id', jobIds);

      // Fetch demo bookings
      const appIds = (appsData || []).map(a => a.id);
      let demoSet = new Set<string>();
      if (appIds.length > 0) {
        const { data: demos } = await supabase
          .from('demo_bookings')
          .select('application_id')
          .in('application_id', appIds);
        demoSet = new Set((demos || []).map(d => d.application_id).filter(Boolean));
      }

      // Fetch hiring confirmations
      const { data: hires } = await supabase
        .from('hiring_confirmations')
        .select('job_id, status')
        .in('job_id', jobIds);

      // Get parent names
      const parentIds = [...new Set(jobsData.map((j: any) => j.parent_id).filter(Boolean))];
      let parentMap = new Map<string, string>();
      if (parentIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', parentIds as string[]);
        parentMap = new Map((profs || []).map(p => [p.id, p.full_name]));
      }

      // Classify each application into a stage
      const stageOf = (app: any): string => {
        if (app.status === 'accepted') return 'accepted';
        if (app.status === 'rejected' || app.status === 'withdrawn') return 'rejected';
        if (app.status === 'invited_to_demo' || demoSet.has(app.id)) return 'demo';
        if (app.status === 'shortlisted') return 'shortlisted';
        return 'applied';
      };

      // Build app stages per job
      const appsByJob = new Map<string, any[]>();
      for (const app of appsData || []) {
        if (!appsByJob.has(app.job_id)) appsByJob.set(app.job_id, []);
        appsByJob.get(app.job_id)!.push({ ...app, stage: stageOf(app) });
      }

      // Hire count per job
      const hiresByJob = new Map<string, number>();
      for (const h of hires || []) {
        if (h.status === 'confirmed') {
          hiresByJob.set(h.job_id, (hiresByJob.get(h.job_id) || 0) + 1);
        }
      }

      // Build funnel counts
      const totalJobs = jobsData.length;
      const jobsWithApps = jobsData.filter((j: any) => (appsByJob.get(j.id)?.length || 0) > 0).length;
      const totalApplied = (appsData || []).length;
      const totalShortlisted = (appsData || []).filter(a => stageOf(a) === 'shortlisted' || stageOf(a) === 'demo' || stageOf(a) === 'accepted').length;
      const totalDemo = (appsData || []).filter(a => stageOf(a) === 'demo' || stageOf(a) === 'accepted').length;
      const totalAccepted = (appsData || []).filter(a => stageOf(a) === 'accepted').length;
      const totalHired = Array.from(hiresByJob.values()).reduce((s, c) => s + c, 0);

      const stages: FunnelStage[] = [
        { key: 'posted', label: 'Jobs Posted', count: totalJobs, color: 'bg-blue-500', icon: Briefcase },
        { key: 'with_apps', label: 'With Applications', count: jobsWithApps, color: 'bg-indigo-500', icon: Users },
        { key: 'applied', label: 'Total Applications', count: totalApplied, color: 'bg-violet-500', icon: Clock },
        { key: 'shortlisted', label: 'Shortlisted', count: totalShortlisted, color: 'bg-amber-500', icon: Star },
        { key: 'demo', label: 'Demo Class', count: totalDemo, color: 'bg-orange-500', icon: BookOpen },
        { key: 'accepted', label: 'Accepted', count: totalAccepted, color: 'bg-green-500', icon: CheckCircle2 },
        { key: 'hired', label: 'Hired', count: totalHired, color: 'bg-emerald-600', icon: TrendingUp },
      ];
      setFunnel(stages);

      // Conversion rates
      const rates = [
        { label: 'Jobs → Applications', rate: totalJobs > 0 ? (jobsWithApps / totalJobs) * 100 : 0 },
        { label: 'Applied → Shortlisted', rate: totalApplied > 0 ? (totalShortlisted / totalApplied) * 100 : 0 },
        { label: 'Shortlisted → Demo', rate: totalShortlisted > 0 ? (totalDemo / totalShortlisted) * 100 : 0 },
        { label: 'Demo → Accepted', rate: totalDemo > 0 ? (totalAccepted / totalDemo) * 100 : 0 },
        { label: 'Accepted → Hired', rate: totalAccepted > 0 ? (totalHired / totalAccepted) * 100 : 0 },
      ];
      setConversionRates(rates);

      // Build pipeline jobs
      const pipelineJobs: PipelineJob[] = jobsData.map((j: any) => {
        const apps = appsByJob.get(j.id) || [];
        const stagesCount: Record<string, number> = { applied: 0, shortlisted: 0, demo: 0, accepted: 0, rejected: 0 };
        for (const a of apps) stagesCount[a.stage] = (stagesCount[a.stage] || 0) + 1;
        stagesCount.hired = hiresByJob.get(j.id) || 0;
        return {
          id: j.id,
          title: j.title,
          job_reference: j.job_reference,
          status: j.status,
          created_at: j.created_at,
          district_name: (j.districts as any)?.name_en || null,
          parent_name: parentMap.get(j.parent_id) || null,
          total_applications: j.total_applications || 0,
          stages: stagesCount,
        };
      });

      setJobs(pipelineJobs);
    } catch (err) {
      console.error('Pipeline fetch error:', err);
    }
    setLoading(false);
  }, [periodFilter]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const filteredJobs = selectedStage
    ? jobs.filter(j => {
        if (selectedStage === 'posted') return true;
        if (selectedStage === 'with_apps') return j.total_applications > 0;
        return (j.stages[selectedStage] || 0) > 0;
      })
    : jobs;

  const maxCount = Math.max(...funnel.map(s => s.count), 1);

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Pipeline & Funnel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visualize the full job lifecycle from posting to hire</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchPipeline} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Funnel visualization */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Conversion Funnel</p>
              <div className="space-y-2">
                {funnel.map((stage, idx) => {
                  const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
                  const isSelected = selectedStage === stage.key;
                  return (
                    <button
                      key={stage.key}
                      onClick={() => setSelectedStage(isSelected ? null : stage.key)}
                      className={`w-full text-left transition-all rounded-lg ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-28 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <stage.icon className="h-3.5 w-3.5" />
                          <span className="truncate">{stage.label}</span>
                        </div>
                        <div className="flex-1 h-8 rounded-md bg-muted/30 relative overflow-hidden">
                          <div
                            className={`h-full ${stage.color} rounded-md transition-all duration-500 flex items-center`}
                            style={{ width: `${widthPct}%`, opacity: isSelected ? 1 : 0.75 }}
                          >
                            <span className="text-white text-xs font-bold px-2 whitespace-nowrap">
                              {stage.count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {idx < funnel.length - 1 && (
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Conversion rates */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {conversionRates.map(cr => (
              <div key={cr.label} className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-[11px] text-muted-foreground mb-1">{cr.label}</p>
                <p className={`text-lg font-bold ${cr.rate >= 50 ? 'text-green-600 dark:text-green-400' : cr.rate >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                  {cr.rate.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>

          {/* Jobs table by stage */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                {selectedStage
                  ? `Jobs — ${funnel.find(s => s.key === selectedStage)?.label || selectedStage} (${filteredJobs.length})`
                  : `All Jobs (${filteredJobs.length})`}
              </p>
              {selectedStage && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedStage(null)} className="text-xs">
                  Clear filter
                </Button>
              )}
            </div>
            <ScrollArea className="h-[calc(100vh-550px)] min-h-[300px]">
              <div className="space-y-2">
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">No jobs in this stage.</div>
                ) : (
                  filteredJobs.map(job => (
                    <div key={job.id} className="border rounded-lg p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {job.job_reference && (
                              <span className="text-[10px] font-mono text-muted-foreground">{job.job_reference}</span>
                            )}
                            <Badge className={`text-[10px] ${statusColor(job.status)}`}>{job.status}</Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{job.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                            {job.district_name && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.district_name}</span>}
                            {job.parent_name && <span>by {job.parent_name}</span>}
                            <span>{formatExactDate(job.created_at)}</span>
                          </div>
                        </div>
                        {/* Mini stage pills */}
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          {[
                            { key: 'applied', label: 'App', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
                            { key: 'shortlisted', label: 'SL', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                            { key: 'demo', label: 'Demo', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                            { key: 'accepted', label: 'Acc', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                            { key: 'hired', label: 'Hire', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                          ].map(s => {
                            const cnt = job.stages[s.key] || 0;
                            if (cnt === 0) return null;
                            return (
                              <span key={s.key} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.color}`}>
                                {s.label} {cnt}
                              </span>
                            );
                          })}
                          {Object.values(job.stages).every(v => v === 0) && (
                            <span className="text-[10px] text-muted-foreground">No activity</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
