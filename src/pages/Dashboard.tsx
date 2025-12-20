import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, LogOut, User, Briefcase, MessageSquare, Star, Globe,
  Plus, MapPin, Clock, Users, BookOpen, Search, CheckCircle2, Settings
} from 'lucide-react';

interface District { id: string; name_en: string; name_bn: string; }
interface Subject { id: string; name_en: string; name_bn: string; }
interface Job { 
  id: string; title: string; description: string; status: string; 
  total_applications: number; created_at: string; 
  districts: { name_en: string }; subjects: { name_en: string } | null;
}

export default function Dashboard() {
  const { user, role, loading, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [districts, setDistricts] = useState<District[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [showPostJob, setShowPostJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Job form state
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    district_id: '',
    class_level: '',
    days_per_week: 3,
    budget_min: 3000,
    budget_max: 8000,
    teaching_mode: 'in_person',
    preferred_tutor_gender: 'any',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    const [districtsRes, subjectsRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
    ]);
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);

    if (role === 'parent') {
      const { data } = await supabase
        .from('jobs')
        .select('*, districts (name_en), subjects (name_en)')
        .eq('parent_id', user?.id)
        .order('created_at', { ascending: false });
      if (data) setMyJobs(data as unknown as Job[]);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const { error } = await supabase.from('jobs').insert({
      parent_id: user.id,
      title: jobForm.title,
      description: jobForm.description,
      subject_id: jobForm.subject_id || null,
      district_id: jobForm.district_id,
      class_level: jobForm.class_level,
      days_per_week: jobForm.days_per_week,
      budget_min: jobForm.budget_min,
      budget_max: jobForm.budget_max,
      teaching_mode: jobForm.teaching_mode as 'online' | 'in_person' | 'hybrid',
      preferred_tutor_gender: jobForm.preferred_tutor_gender as 'male' | 'female' | 'any',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Job posted successfully' });
      setShowPostJob(false);
      setJobForm({
        title: '', description: '', subject_id: '', district_id: '', class_level: '',
        days_per_week: 3, budget_min: 3000, budget_max: 8000,
        teaching_mode: 'in_person', preferred_tutor_gender: 'any',
      });
      fetchData();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Manage Tutor</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
              <Globe className="h-4 w-4 mr-1" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!
          </h1>
          <div className="flex items-center gap-2">
            <Badge className={`${
              role === 'parent' ? 'bg-parent' : 
              role === 'tutor' ? 'bg-tutor' : 
              role === 'agency' ? 'bg-agency' : 'bg-primary'
            } text-primary-foreground`}>
              {t(`role.${role}`) || 'User'}
            </Badge>
          </div>
        </div>

        {/* Parent Dashboard */}
        {role === 'parent' && (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <Dialog open={showPostJob} onOpenChange={setShowPostJob}>
                <DialogTrigger asChild>
                  <Card className="hover-lift cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-40">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-bold">Post a Tuition Job</h3>
                      <p className="text-sm text-muted-foreground">Find the perfect tutor</p>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Post a Tuition Job</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePostJob} className="space-y-4 mt-4">
                    <div>
                      <Label>Job Title *</Label>
                      <Input
                        placeholder="e.g., Math Tutor Needed for Class 10 Student"
                        value={jobForm.title}
                        onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Description *</Label>
                      <Textarea
                        placeholder="Describe your requirements, schedule preferences, etc."
                        value={jobForm.description}
                        onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                        required
                        rows={3}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Subject</Label>
                        <Select value={jobForm.subject_id} onValueChange={(v) => setJobForm({ ...jobForm, subject_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                          <SelectContent>
                            {subjects.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Location *</Label>
                        <Select value={jobForm.district_id} onValueChange={(v) => setJobForm({ ...jobForm, district_id: v })} required>
                          <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                          <SelectContent>
                            {districts.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name_en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Class Level</Label>
                        <Input
                          placeholder="e.g., Class 10, HSC, University"
                          value={jobForm.class_level}
                          onChange={(e) => setJobForm({ ...jobForm, class_level: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Days per Week</Label>
                        <Select value={String(jobForm.days_per_week)} onValueChange={(v) => setJobForm({ ...jobForm, days_per_week: Number(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7].map(n => (
                              <SelectItem key={n} value={String(n)}>{n} day{n > 1 ? 's' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Budget (Min ৳/month)</Label>
                        <Input
                          type="number"
                          value={jobForm.budget_min}
                          onChange={(e) => setJobForm({ ...jobForm, budget_min: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Budget (Max ৳/month)</Label>
                        <Input
                          type="number"
                          value={jobForm.budget_max}
                          onChange={(e) => setJobForm({ ...jobForm, budget_max: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Teaching Mode</Label>
                        <Select value={jobForm.teaching_mode} onValueChange={(v) => setJobForm({ ...jobForm, teaching_mode: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_person">In-Person</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Preferred Tutor Gender</Label>
                        <Select value={jobForm.preferred_tutor_gender} onValueChange={(v) => setJobForm({ ...jobForm, preferred_tutor_gender: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Posting...' : 'Post Job'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Link to="/tutors">
                <Card className="hover-lift cursor-pointer h-40">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-12 h-12 rounded-xl bg-tutor/10 flex items-center justify-center mb-3">
                      <Search className="h-6 w-6 text-tutor" />
                    </div>
                    <h3 className="font-bold">Find Tutors</h3>
                    <p className="text-sm text-muted-foreground">Browse verified tutors</p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="hover-lift cursor-pointer h-40">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-bold">Messages</h3>
                  <p className="text-sm text-muted-foreground">Chat with tutors</p>
                </CardContent>
              </Card>
            </div>

            {/* My Jobs */}
            <div>
              <h2 className="text-xl font-bold mb-4">My Posted Jobs</h2>
              {myJobs.length > 0 ? (
                <div className="space-y-4">
                  {myJobs.map((job) => (
                    <Card key={job.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">{job.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {job.districts?.name_en}
                            {job.subjects && (
                              <>
                                <span className="text-border">•</span>
                                <BookOpen className="h-3 w-3" />
                                {job.subjects.name_en}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                          <div className="text-right">
                            <div className="font-bold text-primary">{job.total_applications}</div>
                            <div className="text-xs text-muted-foreground">applications</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-bold mb-2">No jobs posted yet</h3>
                    <p className="text-muted-foreground mb-4">Post your first tuition job to find the perfect tutor</p>
                    <Button onClick={() => setShowPostJob(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Post a Job
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Tutor Dashboard */}
        {role === 'tutor' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/jobs">
                <Card className="hover-lift cursor-pointer h-40">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold">Browse Jobs</h3>
                    <p className="text-sm text-muted-foreground">Find tuition opportunities</p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="hover-lift cursor-pointer h-40">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-tutor/10 flex items-center justify-center mb-3">
                    <User className="h-6 w-6 text-tutor" />
                  </div>
                  <h3 className="font-bold">My Profile</h3>
                  <p className="text-sm text-muted-foreground">Update your profile</p>
                </CardContent>
              </Card>

              <Card className="hover-lift cursor-pointer h-40">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-bold">Messages</h3>
                  <p className="text-sm text-muted-foreground">Chat with parents</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>A complete profile helps you get more students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Add your bio', 'Add education details', 'Set your hourly rate', 'Add subjects you teach', 'Upload verification documents'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-muted-foreground">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-4">
                  <Settings className="h-4 w-4 mr-2" />
                  Complete Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agency Dashboard */}
        {role === 'agency' && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-lift cursor-pointer h-40">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-agency/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-agency" />
                </div>
                <h3 className="font-bold">Manage Tutors</h3>
                <p className="text-sm text-muted-foreground">Add & manage your tutors</p>
              </CardContent>
            </Card>

            <Link to="/jobs">
              <Card className="hover-lift cursor-pointer h-40">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold">Browse Jobs</h3>
                  <p className="text-sm text-muted-foreground">Find opportunities</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover-lift cursor-pointer h-40">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-bold">Analytics</h3>
                <p className="text-sm text-muted-foreground">View performance</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
