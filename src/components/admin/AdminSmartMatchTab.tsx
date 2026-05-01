import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/lib/adminLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Briefcase, GraduationCap, MapPin, Users, Zap,
  CheckCircle2, Plus, Star, Filter, ChevronRight, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MatchedTutor {
  tutor_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string;
  experience: number;
  district: string | null;
  district_id: string | null;
  verification: string | null;
  reference: string | null;
  avatar_url: string | null;
  is_available: boolean;
  salary_min: number | null;
  salary_max: number | null;
  subjects: string[];
  matchScore: number;
  matchReasons: string[];
}

interface JobForMatch {
  id: string;
  title: string;
  job_reference: string | null;
  district_id: string | null;
  area_id: string | null;
  district_name: string | null;
  area_name: string | null;
  preferred_tutor_gender: string | null;
  budget_min: number | null;
  budget_max: number | null;
  class_level: string | null;
  teaching_mode: string | null;
  days_per_week: number | null;
  total_applications: number;
  status: string;
  subjects: string[];
  subject_ids: string[];
  parent_name: string | null;
  created_at: string;
  existing_tutor_ids: string[];
}

export function AdminSmartMatchTab() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobForMatch[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobForMatch | null>(null);
  const [matches, setMatches] = useState<MatchedTutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [jobFilter, setJobFilter] = useState<'open' | 'pending_approval' | 'all'>('open');

  // Apply on behalf dialog
  const [applyDialog, setApplyDialog] = useState<{ tutor: MatchedTutor; mode: 'apply' | 'shortlist' | 'accept' } | null>(null);
  const [coverMessage, setCoverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select(`
        id, title, job_reference, district_id, area_id, preferred_tutor_gender,
        budget_min, budget_max, class_level, teaching_mode, days_per_week,
        total_applications, status, created_at, parent_id,
        districts ( name_en ), areas ( name_en ),
        job_subjects ( subjects ( id, name_en ) )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (jobFilter !== 'all') {
      query = query.eq('status', jobFilter as any);
    } else {
      query = query.in('status', ['open', 'pending_approval', 'in_progress'] as any);
    }

    const { data } = await query;
    if (!data) { setJobs([]); setLoading(false); return; }

    // Get parent names
    const parentIds = [...new Set(data.map((j: any) => j.parent_id).filter(Boolean))];
    let parentMap = new Map<string, string>();
    if (parentIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', parentIds as string[]);
      parentMap = new Map((profs || []).map(p => [p.id, p.full_name]));
    }

    // Get existing applications per job
    const jobIds = data.map((j: any) => j.id);
    const { data: existingApps } = await supabase
      .from('applications')
      .select('job_id, tutor_id')
      .in('job_id', jobIds);
    const appsByJob = new Map<string, string[]>();
    for (const a of existingApps || []) {
      if (!appsByJob.has(a.job_id)) appsByJob.set(a.job_id, []);
      appsByJob.get(a.job_id)!.push(a.tutor_id);
    }

    setJobs(data.map((j: any) => ({
      id: j.id,
      title: j.title,
      job_reference: j.job_reference,
      district_id: j.district_id,
      area_id: j.area_id,
      district_name: (j.districts as any)?.name_en || null,
      area_name: (j.areas as any)?.name_en || null,
      preferred_tutor_gender: j.preferred_tutor_gender,
      budget_min: j.budget_min,
      budget_max: j.budget_max,
      class_level: j.class_level,
      teaching_mode: j.teaching_mode,
      days_per_week: j.days_per_week,
      total_applications: j.total_applications || 0,
      status: j.status,
      subjects: ((j.job_subjects as any[]) || []).map((js: any) => js.subjects?.name_en).filter(Boolean),
      subject_ids: ((j.job_subjects as any[]) || []).map((js: any) => js.subjects?.id).filter(Boolean),
      parent_name: parentMap.get(j.parent_id) || null,
      created_at: j.created_at,
      existing_tutor_ids: appsByJob.get(j.id) || [],
    })));
    setLoading(false);
  }, [jobFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const findMatches = async (job: JobForMatch) => {
    setSelectedJob(job);
    setMatching(true);
    setMatches([]);

    try {
      // Fetch all available tutors with their subjects
      let tutorQuery = supabase
        .from('tutor_profiles')
        .select('id, user_id, gender, experience_years, district_id, area_id, verification_status, is_available, monthly_salary_min, monthly_salary_max, bio')
        .eq('is_available', true)
        .limit(500);

      const { data: tutors } = await tutorQuery;
      if (!tutors || tutors.length === 0) { setMatches([]); setMatching(false); return; }

      // Get tutor subjects
      const tutorIds = tutors.map(t => t.id);
      const { data: tutorSubjects } = await supabase
        .from('tutor_subjects')
        .select('tutor_profile_id, subjects ( id, name_en )')
        .in('tutor_profile_id', tutorIds);

      const subjectsByTutor = new Map<string, { id: string; name: string }[]>();
      for (const ts of tutorSubjects || []) {
        const tid = (ts as any).tutor_profile_id;
        if (!subjectsByTutor.has(tid)) subjectsByTutor.set(tid, []);
        const subj = (ts as any).subjects;
        if (subj) subjectsByTutor.get(tid)!.push({ id: subj.id, name: subj.name_en });
      }

      // Get profiles
      const userIds = tutors.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, user_reference')
        .in('id', userIds);
      const profMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get district names
      const districtIds = [...new Set(tutors.map(t => t.district_id).filter(Boolean))] as string[];
      let districtMap = new Map<string, string>();
      if (districtIds.length > 0) {
        const { data: dists } = await supabase.from('districts').select('id, name_en').in('id', districtIds);
        districtMap = new Map((dists || []).map(d => [d.id, d.name_en]));
      }

      // Score each tutor
      const scored: MatchedTutor[] = tutors.map(t => {
        const prof = profMap.get(t.user_id);
        const tutorSubs = subjectsByTutor.get(t.id) || [];
        let score = 0;
        const reasons: string[] = [];

        // District match (+30)
        if (job.district_id && t.district_id === job.district_id) {
          score += 30;
          reasons.push('Same district');
        }

        // Area match (+15 bonus)
        if (job.area_id && t.area_id === job.area_id) {
          score += 15;
          reasons.push('Same area');
        }

        // Gender match (+15)
        if (job.preferred_tutor_gender && job.preferred_tutor_gender !== 'any') {
          if (t.gender === job.preferred_tutor_gender) {
            score += 15;
            reasons.push('Gender match');
          } else {
            score -= 10;
          }
        }

        // Subject match (+20 per match)
        if (job.subject_ids.length > 0) {
          const tutorSubIds = tutorSubs.map(s => s.id);
          const matchCount = job.subject_ids.filter(sid => tutorSubIds.includes(sid)).length;
          if (matchCount > 0) {
            score += 20 * matchCount;
            reasons.push(`${matchCount} subject${matchCount > 1 ? 's' : ''} match`);
          }
        }

        // Budget/salary compatibility (+10)
        if (job.budget_max && t.monthly_salary_min) {
          if (t.monthly_salary_min <= job.budget_max) {
            score += 10;
            reasons.push('Budget compatible');
          }
        }

        // Verification bonus (+10)
        if (t.verification_status === 'approved') {
          score += 10;
          reasons.push('Verified');
        }

        // Experience bonus (+5 per year, max 15)
        if (t.experience_years) {
          score += Math.min(t.experience_years * 5, 15);
          if (t.experience_years >= 3) reasons.push(`${t.experience_years}yr exp`);
        }

        // Penalize if already applied
        if (job.existing_tutor_ids.includes(t.id)) {
          score = -100;
          reasons.length = 0;
          reasons.push('Already applied');
        }

        return {
          tutor_id: t.id,
          user_id: t.user_id,
          name: prof?.full_name || 'Unknown',
          email: prof?.email || '',
          phone: prof?.phone || null,
          gender: t.gender,
          experience: t.experience_years || 0,
          district: t.district_id ? districtMap.get(t.district_id) || null : null,
          district_id: t.district_id,
          verification: t.verification_status,
          reference: prof?.user_reference || null,
          avatar_url: prof?.avatar_url || null,
          is_available: t.is_available ?? false,
          salary_min: t.monthly_salary_min,
          salary_max: t.monthly_salary_max,
          subjects: tutorSubs.map(s => s.name),
          matchScore: score,
          matchReasons: reasons,
        };
      });

      // Sort by score descending, take top 50
      scored.sort((a, b) => b.matchScore - a.matchScore);
      setMatches(scored.filter(s => s.matchScore > 0).slice(0, 50));
    } catch (err) {
      console.error('Match error:', err);
      toast({ title: 'Error finding matches', variant: 'destructive' });
    }
    setMatching(false);
  };

  const handleApplyOnBehalf = async () => {
    if (!applyDialog || !selectedJob) return;
    setSubmitting(true);
    try {
      const statusMap = { apply: 'pending', shortlist: 'shortlisted', accept: 'accepted' } as const;
      const status = statusMap[applyDialog.mode];

      const { error } = await supabase.from('applications').insert({
        job_id: selectedJob.id,
        tutor_id: applyDialog.tutor.tutor_id,
        status: status as any,
        cover_message: coverMessage || `${applyDialog.mode === 'apply' ? 'Applied' : applyDialog.mode === 'shortlist' ? 'Shortlisted' : 'Accepted'} by admin`,
      });
      if (error) throw error;

      // If accepting, update job status
      if (applyDialog.mode === 'accept') {
        await supabase.from('jobs').update({ status: 'in_progress' as any }).eq('id', selectedJob.id);
      }

      // Notify tutor
      const titleMap = {
        apply: 'You have been applied to a job',
        shortlist: 'You have been shortlisted for a job!',
        accept: 'You have been assigned to a job!',
      };
      await supabase.from('notifications').insert({
        user_id: applyDialog.tutor.user_id,
        title: titleMap[applyDialog.mode],
        message: `Admin action for: ${selectedJob.title}`,
        type: `application_${status}`,
        reference_id: selectedJob.id,
      });

      await logAdminAction(`${applyDialog.mode}_on_behalf`, 'application', {
        tutor_id: applyDialog.tutor.tutor_id,
        job_id: selectedJob.id,
        tutor_name: applyDialog.tutor.name,
        job_title: selectedJob.title,
      });

      toast({ title: `Tutor ${applyDialog.mode === 'apply' ? 'applied' : applyDialog.mode === 'shortlist' ? 'shortlisted' : 'accepted'} successfully` });

      // Refresh matches to update "already applied" state
      setApplyDialog(null);
      setCoverMessage('');
      findMatches({ ...selectedJob, existing_tutor_ids: [...selectedJob.existing_tutor_ids, applyDialog.tutor.tutor_id] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 40) return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
    return 'text-muted-foreground bg-muted border-border';
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Smart Matching
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find the best tutors for open jobs based on district, subjects, gender & availability</p>
        </div>
        <Select value={jobFilter} onValueChange={(v) => setJobFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open Jobs</SelectItem>
            <SelectItem value="pending_approval">Pending Jobs</SelectItem>
            <SelectItem value="all">All Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Job list - left panel */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select a Job ({jobs.length})</p>
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-2 pr-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No jobs found</div>
              ) : (
                jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => findMatches(job)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedJob?.id === job.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {job.job_reference && (
                            <span className="text-[10px] font-mono text-muted-foreground">{job.job_reference}</span>
                          )}
                          <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">{job.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {job.district_name && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />{job.district_name}
                            </span>
                          )}
                          {job.subjects.length > 0 && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {job.subjects.slice(0, 2).join(', ')}{job.subjects.length > 2 ? ` +${job.subjects.length - 2}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted-foreground">{job.total_applications} apps</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Match results - right panel */}
        <div className="lg:col-span-3 space-y-3">
          {!selectedJob ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              <div className="text-center">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Select a job to find matching tutors</p>
              </div>
            </div>
          ) : matching ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Finding best matches...</p>
              </div>
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{selectedJob.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {selectedJob.district_name && <span><MapPin className="h-3 w-3 inline" /> {selectedJob.district_name}</span>}
                        {selectedJob.preferred_tutor_gender && selectedJob.preferred_tutor_gender !== 'any' && (
                          <span>Gender: {selectedJob.preferred_tutor_gender}</span>
                        )}
                        {selectedJob.budget_max && <span>Budget: ৳{selectedJob.budget_max}</span>}
                        {selectedJob.subjects.length > 0 && <span>Subjects: {selectedJob.subjects.join(', ')}</span>}
                      </div>
                    </div>
                    <Badge>{matches.length} matches</Badge>
                  </div>
                </CardContent>
              </Card>

              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-2 pr-2">
                  {matches.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No matching tutors found for this job's criteria.
                    </div>
                  ) : (
                    matches.map((t, idx) => (
                      <div key={t.tutor_id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs font-mono text-muted-foreground w-5">#{idx + 1}</span>
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={t.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{t.name}</span>
                              {t.reference && <Badge variant="outline" className="text-[10px] font-mono">{t.reference}</Badge>}
                              {t.verification === 'approved' && (
                                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" />Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                              <span className="capitalize">{t.gender}</span>
                              <span>·</span>
                              <span>{t.experience}yr exp</span>
                              {t.district && <><span>·</span><span>{t.district}</span></>}
                              {t.salary_min && <><span>·</span><span>৳{t.salary_min?.toLocaleString()}{t.salary_max ? `-${t.salary_max.toLocaleString()}` : '+'}</span></>}
                            </div>
                            {t.subjects.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {t.subjects.slice(0, 5).map(s => (
                                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                ))}
                                {t.subjects.length > 5 && <Badge variant="secondary" className="text-[10px]">+{t.subjects.length - 5}</Badge>}
                              </div>
                            )}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {t.matchReasons.map(r => (
                                <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{r}</span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-right space-y-1.5">
                            <div className={`text-xs font-bold px-2 py-1 rounded border ${scoreColor(t.matchScore)}`}>
                              {t.matchScore}pt
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => { setApplyDialog({ tutor: t, mode: 'apply' }); setCoverMessage(''); }}
                              >
                                <Plus className="h-3 w-3 mr-0.5" /> Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => { setApplyDialog({ tutor: t, mode: 'shortlist' }); setCoverMessage(''); }}
                              >
                                <Star className="h-3 w-3 mr-0.5" /> Shortlist
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => { setApplyDialog({ tutor: t, mode: 'accept' }); setCoverMessage(''); }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Accept
                              </Button>
                            </div>
                            <Link
                              to={`/admin/tutor-detail/${t.user_id}`}
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 justify-end"
                            >
                              <Eye className="h-3 w-3" /> Profile
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* Apply on behalf dialog */}
      <Dialog open={!!applyDialog} onOpenChange={() => setApplyDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {applyDialog?.mode === 'apply' ? 'Apply on Behalf' : applyDialog?.mode === 'shortlist' ? 'Shortlist on Behalf' : 'Accept on Behalf'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Tutor: </span>
              <span className="font-medium">{applyDialog?.tutor.name}</span>
              {applyDialog?.tutor.reference && <Badge variant="outline" className="ml-2 text-[10px]">{applyDialog.tutor.reference}</Badge>}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Job: </span>
              <span className="font-medium">{selectedJob?.title}</span>
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={coverMessage}
                onChange={e => setCoverMessage(e.target.value)}
                placeholder="Admin note for this application..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialog(null)}>Cancel</Button>
            <Button onClick={handleApplyOnBehalf} disabled={submitting}>
              {submitting ? 'Processing...' : applyDialog?.mode === 'apply' ? 'Apply' : applyDialog?.mode === 'shortlist' ? 'Shortlist' : 'Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
