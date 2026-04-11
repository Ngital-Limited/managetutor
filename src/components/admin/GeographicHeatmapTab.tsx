import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Users, Briefcase, TrendingUp, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DistrictData {
  id: string;
  name_en: string;
  division_en: string;
  tutorCount: number;
  jobCount: number;
  openJobCount: number;
  ratio: number; // tutors per job
}

export function GeographicHeatmapTab({ toast }: { toast: any }) {
  const [districts, setDistricts] = useState<DistrictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchingStats, setMatchingStats] = useState({ avgTimeToHire: 0, totalMatches: 0, pendingJobs: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [districtsRes, tutorsRes, jobsRes, applicationsRes] = await Promise.all([
      supabase.from('districts').select('id, name_en, division_en'),
      supabase.from('tutor_profiles').select('district_id'),
      supabase.from('jobs').select('id, district_id, status, created_at'),
      supabase.from('applications').select('id, job_id, status, created_at'),
    ]);

    const allDistricts = districtsRes.data || [];
    const tutors = tutorsRes.data || [];
    const jobs = jobsRes.data || [];
    const applications = applicationsRes.data || [];

    // Count tutors and jobs per district
    const tutorsByDistrict: Record<string, number> = {};
    const jobsByDistrict: Record<string, number> = {};
    const openJobsByDistrict: Record<string, number> = {};

    tutors.forEach(t => {
      if (t.district_id) tutorsByDistrict[t.district_id] = (tutorsByDistrict[t.district_id] || 0) + 1;
    });
    jobs.forEach(j => {
      jobsByDistrict[j.district_id] = (jobsByDistrict[j.district_id] || 0) + 1;
      if (j.status === 'open') openJobsByDistrict[j.district_id] = (openJobsByDistrict[j.district_id] || 0) + 1;
    });

    const districtData: DistrictData[] = allDistricts
      .map(d => ({
        id: d.id,
        name_en: d.name_en,
        division_en: d.division_en,
        tutorCount: tutorsByDistrict[d.id] || 0,
        jobCount: jobsByDistrict[d.id] || 0,
        openJobCount: openJobsByDistrict[d.id] || 0,
        ratio: (jobsByDistrict[d.id] || 0) > 0 ? (tutorsByDistrict[d.id] || 0) / (jobsByDistrict[d.id] || 1) : 0,
      }))
      .filter(d => d.tutorCount > 0 || d.jobCount > 0)
      .sort((a, b) => b.jobCount - a.jobCount);

    setDistricts(districtData);

    // Matching efficiency
    const acceptedApps = applications.filter(a => a.status === 'accepted');
    const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'in_progress');
    let totalDays = 0;
    completedJobs.forEach(j => {
      const firstAccepted = acceptedApps.find(a => a.job_id === j.id);
      if (firstAccepted) {
        const days = (new Date(firstAccepted.created_at!).getTime() - new Date(j.created_at!).getTime()) / (1000 * 60 * 60 * 24);
        totalDays += Math.max(0, days);
      }
    });

    setMatchingStats({
      avgTimeToHire: completedJobs.length > 0 ? Math.round(totalDays / completedJobs.length) : 0,
      totalMatches: acceptedApps.length,
      pendingJobs: jobs.filter(j => j.status === 'open').length,
    });

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const top10 = districts.slice(0, 10);
  const highDemand = districts.filter(d => d.openJobCount > 0 && d.ratio < 1).slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Geographic Analytics</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Time to Hire</p>
              <p className="text-2xl font-bold">{matchingStats.avgTimeToHire} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Matches</p>
              <p className="text-2xl font-bold">{matchingStats.totalMatches}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Briefcase className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Open Jobs</p>
              <p className="text-2xl font-bold">{matchingStats.pendingJobs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Top Districts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Districts by Activity</CardTitle>
          <CardDescription>Tutors vs Jobs in most active areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name_en" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="tutorCount" name="Tutors" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="jobCount" name="Jobs" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* High Demand Areas (Low Supply) */}
      {highDemand.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              High Demand, Low Supply Areas
            </CardTitle>
            <CardDescription>Districts with more open jobs than available tutors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highDemand.map(d => (
                <div key={d.id} className="flex items-center gap-4">
                  <div className="w-32 shrink-0">
                    <p className="font-medium text-sm">{d.name_en}</p>
                    <p className="text-xs text-muted-foreground">{d.division_en}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{d.tutorCount} tutors</span>
                      <span>{d.openJobCount} open jobs</span>
                    </div>
                    <Progress value={Math.min(100, (d.tutorCount / Math.max(1, d.openJobCount)) * 100)} className="h-2" />
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive shrink-0">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {d.ratio.toFixed(1)} ratio
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full District Table */}
      <Card>
        <CardHeader><CardTitle>All Districts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Tutors</TableHead>
                  <TableHead>Total Jobs</TableHead>
                  <TableHead>Open Jobs</TableHead>
                  <TableHead>Supply/Demand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : districts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name_en}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.division_en}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-primary" />
                        {d.tutorCount}
                      </div>
                    </TableCell>
                    <TableCell>{d.jobCount}</TableCell>
                    <TableCell>
                      {d.openJobCount > 0 ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning">{d.openJobCount}</Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell>
                      {d.ratio >= 2 ? (
                        <Badge variant="outline" className="bg-success/10 text-success">Surplus</Badge>
                      ) : d.ratio >= 1 ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary">Balanced</Badge>
                      ) : d.jobCount > 0 ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">Shortage</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
