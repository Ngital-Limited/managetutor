import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  GraduationCap, ArrowLeft, Globe, MapPin, BookOpen, Calendar, Users, User,
  DollarSign, Clock, CheckCircle2, XCircle, Send, Star, MessageSquare,
  Briefcase, UserCheck, Phone, Mail
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  class_level: string;
  days_per_week: number;
  duration_hours: number;
  budget_min: number;
  budget_max: number;
  teaching_mode: string;
  preferred_tutor_gender: string;
  student_gender: string;
  special_requirements: string | null;
  preferred_time: string | null;
  status: string;
  total_applications: number;
  created_at: string;
  parent_id: string;
  number_of_students: number;
  student_age: string | null;
  start_date: string | null;
  location_details: string | null;
  job_reference: string | null;
  districts: { name_en: string; name_bn: string } | null;
  subjects: { name_en: string; name_bn: string } | null;
  job_subjects?: { subjects: { name_en: string; name_bn: string } }[];
}

interface Application {
  id: string;
  cover_message: string;
  proposed_rate: number;
  status: string;
  created_at: string;
  tutor_profiles: {
    id: string;
    user_id: string;
    bio: string;
    education: string;
    experience_years: number;
    average_rating: number;
    total_reviews: number;
    verification_status: string;
    verification_paid: boolean;
    profiles: { full_name: string; avatar_url: string; phone: string };
  };
}

export default function JobDetails() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);

  const [applicationForm, setApplicationForm] = useState({
    cover_message: '',
    proposed_rate: 0,
  });

  useEffect(() => {
    if (id) fetchJob();
  }, [id, user]);

  const fetchJob = async () => {
    const { data: jobData, error } = await supabase
      .from('jobs')
      .select(`
        *,
        districts (name_en, name_bn),
        subjects (name_en, name_bn),
        job_subjects (subjects (name_en, name_bn))
      `)
      .eq('id', id)
      .single();
    
    console.log('Job fetch result:', { jobData, error, id });

    if (jobData) {
      setJob(jobData as unknown as Job);
      setApplicationForm(prev => ({
        ...prev,
        proposed_rate: jobData.budget_min || 0
      }));

      // Fetch applications if parent owns this job
      if (user?.id === jobData.parent_id) {
        const { data: apps } = await supabase
          .from('applications')
          .select(`
            *,
            tutor_profiles (
              id, user_id, bio, education, experience_years, average_rating, total_reviews, verification_status, verification_paid,
              profiles:user_id (full_name, avatar_url, phone)
            )
          `)
          .eq('job_id', id)
          .order('created_at', { ascending: false });

        if (apps) setApplications(apps as unknown as Application[]);
      }

      // Check if tutor already applied
      if (role === 'tutor' && user) {
        const { data: tutorProfile } = await supabase
          .from('tutor_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (tutorProfile) {
          const { data: app } = await supabase
            .from('applications')
            .select('*')
            .eq('job_id', id)
            .eq('tutor_id', tutorProfile.id)
            .single();

          if (app) setMyApplication(app as unknown as Application);
        }
      }
    }

    setLoading(false);
  };

   const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !job) return;

    setApplying(true);

    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('id, bio, education, experience_years, monthly_salary_min, verification_status, gender, district_id, teaching_mode, class_levels')
      .eq('user_id', user.id)
      .single();

    if (!tutorProfile) {
      toast({ title: 'Complete Profile', description: 'Please complete your tutor profile first.', variant: 'destructive' });
      navigate('/tutor/profile');
      setApplying(false);
      return;
    }

    // Calculate profile completeness
    let complete = 0;
    if (tutorProfile.bio) complete += 10;
    if (tutorProfile.education) complete += 10;
    if (tutorProfile.experience_years && tutorProfile.experience_years > 0) complete += 10;
    if (tutorProfile.monthly_salary_min && tutorProfile.monthly_salary_min > 0) complete += 10;
    if (tutorProfile.gender) complete += 10;
    if (tutorProfile.district_id) complete += 10;
    if (tutorProfile.teaching_mode) complete += 10;
    if (tutorProfile.class_levels && tutorProfile.class_levels.length > 0) complete += 10;
    if (tutorProfile.verification_status === 'approved') complete += 10;
    const { count } = await supabase.from('tutor_subjects').select('*', { count: 'exact', head: true }).eq('tutor_profile_id', tutorProfile.id);
    if (count && count > 0) complete += 10;

    if (complete < 70) {
      toast({ title: 'Profile Incomplete', description: `Your profile is ${complete}% complete. You need at least 70% to apply.`, variant: 'destructive' });
      navigate('/tutor/profile');
      setApplying(false);
      return;
    }

    const { error } = await supabase.from('applications').insert({
      job_id: job.id,
      tutor_id: tutorProfile.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Application Sent!', description: 'The parent will review your application.' });
      setShowApply(false);
      fetchJob();
    }

    setApplying(false);
  };

  const handleApplicationAction = async (appId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Application ${status}.` });
      
      // If accepted, update job status
      if (status === 'accepted' && job) {
        await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', job.id);
      }
      
      fetchJob();
    }
  };

  const startChat = (tutorUserId: string) => {
    navigate(`/messages?with=${tutorUserId}&job=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <Link to="/jobs"><Button>Browse Jobs</Button></Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === job.parent_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-tutor/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-8 w-8 text-tutor" />
                  </div>
                    <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-2xl font-bold">{job.title}</h1>
                      {job.job_reference && (
                        <Badge variant="outline" className="text-xs font-mono">{job.job_reference}</Badge>
                      )}
                      <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {job.districts?.name_en}
                      <span className="text-border">•</span>
                      Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {job.job_subjects && job.job_subjects.length > 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Subjects</div>
                        <div className="font-medium">
                          {job.job_subjects.map(js => js.subjects.name_en).join(', ')}
                        </div>
                      </div>
                    </div>
                  ) : job.subjects ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Subject</div>
                        <div className="font-medium">{job.subjects.name_en}</div>
                      </div>
                    </div>
                  ) : null}
                  {job.class_level && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Class Level</div>
                        <div className="font-medium">{job.class_level}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Schedule</div>
                      <div className="font-medium">
                        {job.days_per_week} days/week
                        {job.duration_hours ? ` • ${job.duration_hours}hr/session` : ''}
                      </div>
                    </div>
                  </div>
                  {job.number_of_students > 1 && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Number of Students</div>
                        <div className="font-medium">{job.number_of_students}</div>
                      </div>
                    </div>
                  )}
                  {job.student_age && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Student Age</div>
                        <div className="font-medium">{job.student_age}</div>
                      </div>
                    </div>
                  )}
                  {job.start_date && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Start Date</div>
                        <div className="font-medium">{new Date(job.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Preferred Tutor</div>
                      <div className="font-medium capitalize">{job.preferred_tutor_gender || 'Any'} Gender</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Teaching Mode</div>
                      <div className="font-medium capitalize">{job.teaching_mode?.replace('_', ' ') || 'In Person'}</div>
                    </div>
                  </div>
                  {job.student_gender && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <UserCheck className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Student Gender</div>
                        <div className="font-medium capitalize">{job.student_gender}</div>
                      </div>
                    </div>
                  )}
                  {job.preferred_time && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Preferred Time</div>
                        <div className="font-medium capitalize">{job.preferred_time}</div>
                      </div>
                    </div>
                  )}
                </div>

                {job.location_details && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Location Details
                    </h3>
                    <p className="text-sm text-muted-foreground">{job.location_details}</p>
                  </div>
                )}


                {job.special_requirements && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Special Requirements
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {job.special_requirements.split(', ').map((req, i) => (
                        <Badge key={i} variant="secondary">{req}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applications - for parent */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Applications ({applications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length > 0 ? (
                    <Tabs defaultValue="pending">
                      <TabsList className="mb-4">
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="accepted">Accepted</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected</TabsTrigger>
                      </TabsList>
                      {['pending', 'accepted', 'rejected'].map(status => (
                        <TabsContent key={status} value={status} className="space-y-4">
                          {applications.filter(a => a.status === status).map(app => (
                            <div key={app.id} className="p-4 border rounded-xl">
                              <div className="flex items-start gap-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={app.tutor_profiles?.profiles?.avatar_url} />
                                  <AvatarFallback>
                                    {app.tutor_profiles?.profiles?.full_name?.charAt(0) || 'T'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold">{app.tutor_profiles?.profiles?.full_name}</h4>
                                    {app.tutor_profiles?.verification_status === 'approved' && app.tutor_profiles?.verification_paid && (
                                      <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {app.tutor_profiles?.experience_years} yrs experience • 
                                    <Star className="h-3 w-3 inline ml-1 text-accent" /> {app.tutor_profiles?.average_rating || 0}
                                  </p>
                                  <p className="text-sm mb-2">{app.cover_message}</p>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline">Proposed: ৳{app.proposed_rate}/month</Badge>
                                    <span className="text-muted-foreground">
                                      Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {app.status === 'pending' && (
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                  <Button size="sm" onClick={() => handleApplicationAction(app.id, 'accepted')}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleApplicationAction(app.id, 'rejected')}>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => startChat(app.tutor_profiles?.user_id)}>
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Chat
                                  </Button>
                                </div>
                              )}

                              {app.status === 'accepted' && (
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-4 w-4" />
                                      {app.tutor_profiles?.profiles?.phone || 'Not provided'}
                                    </span>
                                    <Button size="sm" variant="outline" onClick={() => startChat(app.tutor_profiles?.user_id)}>
                                      <MessageSquare className="h-4 w-4 mr-1" />
                                      Message
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {applications.filter(a => a.status === status).length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No {status} applications</p>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-bold mb-2">No applications yet</h3>
                      <p className="text-muted-foreground">Tutors will start applying soon!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  ৳{job.budget_min || 0} - {job.budget_max || 0}
                </div>
                <p className="text-muted-foreground text-sm mb-4">per month</p>

                {job.status === 'open' && !myApplication && (
                  <>
                    {role === 'tutor' ? (
                      <Dialog open={showApply} onOpenChange={setShowApply}>
                        <DialogTrigger asChild>
                          <Button className="w-full" size="lg">
                            <Send className="h-4 w-4 mr-2" />
                            Apply Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Apply for this job</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleApply} className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">
                              You're about to apply for <span className="font-medium text-foreground">{job.title}</span>. The guardian will review your profile and contact you if shortlisted.
                            </p>
                            <p className="text-sm">
                              Parent's budget: <span className="font-medium">৳{job.budget_min?.toLocaleString()} - ৳{job.budget_max?.toLocaleString()}</span> / month
                            </p>
                            <Button type="submit" className="w-full" disabled={applying}>
                              {applying ? 'Sending...' : 'Confirm Apply'}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    ) : user ? (
                      <Button className="w-full" size="lg" onClick={() => {
                        toast({
                          title: "Tutor Account Required",
                          description: "You need to register as a tutor to apply for jobs.",
                          variant: "destructive"
                        });
                        navigate('/auth');
                      }}>
                        <Send className="h-4 w-4 mr-2" />
                        Apply Now
                      </Button>
                    ) : (
                      <Link to="/auth">
                        <Button className="w-full" size="lg">
                          <Send className="h-4 w-4 mr-2" />
                          Login to Apply
                        </Button>
                      </Link>
                    )}
                  </>
                )}

                {myApplication && (
                  <div className="p-4 rounded-lg bg-muted">
                    <Badge className={
                      myApplication.status === 'accepted' ? 'bg-success' :
                      myApplication.status === 'rejected' ? 'bg-destructive' : ''
                    }>
                      {myApplication.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {myApplication.status === 'accepted' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {myApplication.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {myApplication.status.charAt(0).toUpperCase() + myApplication.status.slice(1)}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      You applied for ৳{myApplication.proposed_rate}/month
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="capitalize">{job.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-semibold">৳{job.budget_min} - {job.budget_max}</span>
                </div>
              </CardContent>
            </Card>

            {/* Posted By - only show to tutors */}
            {role === 'tutor' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Posted By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>P</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Parent</div>
                      <div className="text-sm text-muted-foreground">Job Poster</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
