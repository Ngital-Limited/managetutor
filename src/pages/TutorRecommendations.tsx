import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, DollarSign, Briefcase, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatExactDate } from '@/lib/date';

interface RecommendedJob {
  id: string;
  slug?: string;
  title: string;
  budget_min: number;
  budget_max: number;
  teaching_mode: string;
  class_level: string;
  created_at: string;
  districts: { name_en: string } | null;
  subjects: { name_en: string } | null;
}

export default function TutorRecommendations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('recommended');
  const [recommended, setRecommended] = useState<RecommendedJob[]>([]);
  const [nearby, setNearby] = useState<RecommendedJob[]>([]);
  const [highPay, setHighPay] = useState<RecommendedJob[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      loadJobs();
    }
  }, [user, authLoading]);

  const loadJobs = async () => {
    if (!user) return;
    const { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('id, district_id, gender')
      .eq('user_id', user.id)
      .single();
    if (!tutorData) return;

    const { data: apps } = await supabase
      .from('applications')
      .select('job_id')
      .eq('tutor_id', tutorData.id);
    const appliedIds = (apps || []).map(a => a.job_id);

    const { data: subs } = await supabase
      .from('tutor_subjects')
      .select('subject_id')
      .eq('tutor_profile_id', tutorData.id);
    const subjectIds = (subs || []).map(s => s.subject_id);

    const baseSelect = 'id, slug, title, budget_min, budget_max, teaching_mode, class_level, created_at, district_id, preferred_tutor_gender, districts(name_en), subjects(name_en)';

    // Gender filter: only jobs where preferred tutor matches this tutor's gender
    // (or 'any'). Applied to all tabs so unrelated jobs don't show.
    const tutorGender = tutorData.gender; // 'male' | 'female' | other

    // RECOMMENDED: tutor's district + gender match + subject match (if any)
    let recQ = supabase
      .from('jobs')
      .select(baseSelect)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);
    if (tutorData.district_id) recQ = recQ.eq('district_id', tutorData.district_id);
    if (tutorGender) recQ = recQ.or(`preferred_tutor_gender.eq.any,preferred_tutor_gender.eq.${tutorGender}`);
    if (subjectIds.length) recQ = recQ.in('subject_id', subjectIds);
    if (appliedIds.length) recQ = recQ.not('id', 'in', `(${appliedIds.join(',')})`);
    const { data: recData } = await recQ;
    setRecommended((recData || []) as unknown as RecommendedJob[]);

    // NEARBY: same district + gender match (no subject filter)
    if (tutorData.district_id) {
      let nearQ = supabase
        .from('jobs')
        .select(baseSelect)
        .eq('status', 'open')
        .eq('district_id', tutorData.district_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (tutorGender) nearQ = nearQ.or(`preferred_tutor_gender.eq.any,preferred_tutor_gender.eq.${tutorGender}`);
      if (appliedIds.length) nearQ = nearQ.not('id', 'in', `(${appliedIds.join(',')})`);
      const { data: nearData } = await nearQ;
      setNearby((nearData || []) as unknown as RecommendedJob[]);
    }

    // HIGH PAY: gender match (district relaxed so tutors see top-paying jobs)
    let highQ = supabase
      .from('jobs')
      .select(baseSelect)
      .eq('status', 'open')
      .order('budget_max', { ascending: false })
      .limit(20);
    if (tutorGender) highQ = highQ.or(`preferred_tutor_gender.eq.any,preferred_tutor_gender.eq.${tutorGender}`);
    if (appliedIds.length) highQ = highQ.not('id', 'in', `(${appliedIds.join(',')})`);
    const { data: highData } = await highQ;
    setHighPay((highData || []) as unknown as RecommendedJob[]);
  };

  const renderList = (jobs: RecommendedJob[], emptyLabel: string) => (
    <div className="space-y-3">
      {jobs.length > 0 ? jobs.map(job => (
        <Link key={job.id} to={`/jobs/${job.slug || job.id}`} className="block">
          <div className="p-4 border rounded-xl hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground hover:text-primary transition-colors">{job.title}</h4>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                  {job.districts && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.districts.name_en}</span>
                  )}
                  {job.subjects && (
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{job.subjects.name_en}</span>
                  )}
                  {job.class_level && <Badge variant="outline" className="text-xs">{job.class_level}</Badge>}
                </div>
              </div>
              <div className="text-right">
                {(job.budget_min || job.budget_max) && (
                  <p className="font-bold text-primary">৳{job.budget_min || 0} - ৳{job.budget_max || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatExactDate(new Date(job.created_at))}</p>
              </div>
            </div>
          </div>
        </Link>
      )) : (
        <div className="text-center py-8">
          <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No {emptyLabel} jobs found</p>
          <Link to="/jobs"><Button variant="link" className="mt-2">Browse All Jobs <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
        </div>
      )}
    </div>
  );

  return (
    <TutorSidebarLayout title="Job Recommendations">
      <div className="container max-w-[1200px] py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Job Recommendations
            </CardTitle>
            <CardDescription>Jobs matched to your profile, location, and earning potential</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4 w-full sm:w-auto inline-flex sm:flex h-auto overflow-x-auto whitespace-nowrap justify-start sm:justify-center scrollbar-none">
                <TabsTrigger value="recommended"><Sparkles className="h-3 w-3 mr-1" />Recommended ({recommended.length})</TabsTrigger>
                <TabsTrigger value="nearby"><MapPin className="h-3 w-3 mr-1" />Near You ({nearby.length})</TabsTrigger>
                <TabsTrigger value="highpay"><DollarSign className="h-3 w-3 mr-1" />High-Paying ({highPay.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="recommended">{renderList(recommended, 'recommended')}</TabsContent>
              <TabsContent value="nearby">{renderList(nearby, 'nearby')}</TabsContent>
              <TabsContent value="highpay">{renderList(highPay, 'high-paying')}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
