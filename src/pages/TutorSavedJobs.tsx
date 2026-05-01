import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, MapPin, BookOpen, Trash2, Briefcase } from 'lucide-react';

interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
  jobs: {
    id: string;
    slug: string;
    title: string;
    status: string;
    budget_min: number;
    budget_max: number;
    class_level: string;
    teaching_mode: string;
    districts: { name_en: string } | null;
    subjects: { name_en: string } | null;
  };
}

export default function TutorSavedJobs() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (user) fetchSavedJobs();
  }, [user, authLoading]);

  const fetchSavedJobs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_jobs')
      .select(`
        id, job_id, created_at,
        jobs (id, slug, title, status, budget_min, budget_max, class_level, teaching_mode,
          districts (name_en),
          subjects (name_en)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setSavedJobs((data || []) as unknown as SavedJob[]);
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('saved_jobs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSavedJobs(prev => prev.filter(j => j.id !== id));
      toast({ title: 'Removed', description: 'Job removed from saved list.' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TutorSidebarLayout title="Saved Jobs">
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bookmark className="h-5 w-5" /> Saved Jobs
        </h1>

        {savedJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No Saved Jobs</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse jobs and click the bookmark icon to save them for later.
              </p>
              <Link to="/jobs">
                <Button>
                  <Briefcase className="h-4 w-4 mr-2" /> Browse Jobs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {savedJobs.map(saved => {
              const job = saved.jobs;
              if (!job) return null;
              return (
                <Card key={saved.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link to={`/jobs/${job.slug || job.id}`} className="hover:text-primary">
                          <h3 className="font-bold text-base line-clamp-1">{job.title}</h3>
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          {job.districts?.name_en && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {job.districts.name_en}
                            </span>
                          )}
                          {job.subjects?.name_en && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> {job.subjects.name_en}
                            </span>
                          )}
                          {job.class_level && <Badge variant="outline" className="text-xs">{job.class_level}</Badge>}
                          {job.budget_min && job.budget_max && (
                            <span>৳{job.budget_min}-{job.budget_max}/mo</span>
                          )}
                        </div>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="mt-2 text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(saved.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TutorSidebarLayout>
  );
}
