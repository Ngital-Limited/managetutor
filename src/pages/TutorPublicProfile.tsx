import { useState, useEffect } from 'react';
import { formatExactDate } from '@/lib/date';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
// Tabs removed — page now uses stacked sections
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap, MapPin, CheckCircle2, Heart,
  Briefcase, BookOpen, User, Users, Share2, Video, Award, Monitor, Home, Sparkles,
} from 'lucide-react';
import BookDemoClassDialog from '@/components/BookDemoClassDialog';


interface TutorProfile {
  id: string;
  user_id: string;
  slug: string | null;
  bio: string;
  education: string;
  experience_years: number;
  monthly_salary_min: number;
  monthly_salary_max: number;
  // rating fields removed
  total_students: number;
  is_available: boolean;
  is_featured: boolean;
  verification_status: string;
  verification_paid: boolean;
  teaching_mode: string;
  gender: string;
  display_name: string | null;
  district_id: string | null;
  area_id: string | null;
  created_at: string;
  video_url: string | null;
  teaching_philosophy: string | null;
  success_stories: string | null;
  featured_blurb: string | null;
  districts: { name_en: string} | null;
  areas: { name_en: string} | null;
}

interface Profile {
  full_name: string;
  avatar_url: string;
  district_id: string;
  user_reference: string | null;
  districts: { name_en: string} | null;
  areas: { name_en: string} | null;
}

interface Subject { id: string; name_en: string; }
// Review interface removed
interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  field_of_study: string | null;
  passing_year: number | null;
  result: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TutorPublicProfile() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  // reviews state removed
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
  const [relatedTutors, setRelatedTutors] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (id) fetchTutorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const fetchTutorData = async () => {
    if (!id) return;
    setLoading(true);

    let tutorData: any = null;
    const selectCols = 'id, user_id, display_name, bio, education, experience_years, monthly_salary_min, monthly_salary_max, teaching_mode, gender, is_available, verification_status, verification_paid, verified_at, total_students, created_at, updated_at, is_featured, district_id, area_id, class_levels, video_url, teaching_philosophy, success_stories, is_student, slug, featured_blurb, districts (name_en), areas (name_en)';

    if (UUID_REGEX.test(id)) {
      // Try id, then user_id
      const r1 = await supabase.from('tutor_profiles').select(selectCols).eq('id', id).maybeSingle();
      tutorData = r1.data;
      if (!tutorData) {
        const r2 = await supabase.from('tutor_profiles').select(selectCols).eq('user_id', id).maybeSingle();
        tutorData = r2.data;
      }
    } else {
      // Treat as slug
      const r = await supabase.from('tutor_profiles').select(selectCols).eq('slug', id).maybeSingle();
      tutorData = r.data;
    }

    if (!tutorData) {
      setLoading(false);
      return;
    }

    // If accessed via UUID but a slug exists, redirect to the pretty URL
    if (UUID_REGEX.test(id) && tutorData.slug) {
      navigate(`/tutor/${tutorData.slug}`, { replace: true });
      return;
    }

    setTutor(tutorData as TutorProfile);

    const [profileRes, subjectsRes, eduRes] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, avatar_url, district_id, user_reference, districts (name_en), areas (name_en)')
        .eq('id', tutorData.user_id).maybeSingle(),
      supabase.from('tutor_subjects').select('subjects (id, name_en)').eq('tutor_profile_id', tutorData.id),
      supabase.from('tutor_education')
        .select('id, degree, institution, field_of_study, passing_year, result')
        .eq('tutor_id', tutorData.id),
    ]);

    setProfile((profileRes.data as unknown as Profile) || {
      full_name: tutorData.display_name || 'Tutor',
      avatar_url: '',
      district_id: tutorData.district_id || '',
      user_reference: null,
      districts: null,
      areas: null,
    });

    if (subjectsRes.data) setSubjects(subjectsRes.data.map((s: any) => s.subjects).filter(Boolean));
    if (eduRes.data) setEducationEntries(eduRes.data as EducationEntry[]);

    if (user && role === 'parent') {
      const { data: favData } = await supabase
        .from('favorites').select('id')
        .eq('parent_id', user.id).eq('tutor_id', tutorData.id).maybeSingle();
      setIsFavorite(!!favData);
    }

    // Related tutors: same district, available, exclude current
    if (tutorData.district_id) {
      const { data: relData } = await supabase
        .from('tutor_profiles')
        .select('id, slug, user_id, display_name, monthly_salary_min, monthly_salary_max, experience_years, teaching_mode, bio, profiles:user_id(full_name, avatar_url)')
        .eq('district_id', tutorData.district_id)
        .eq('is_available', true)
        .neq('id', tutorData.id)
        .limit(4);
      setRelatedTutors(relData || []);
    }

    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user || !tutor) {
      const redirect = window.location.pathname + window.location.search;
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    setFavoriteLoading(true);
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('parent_id', user.id).eq('tutor_id', tutor.id);
      setIsFavorite(false);
      toast({ title: 'Removed', description: 'Tutor removed from favorites' });
    } else {
      await supabase.from('favorites').insert({ parent_id: user.id, tutor_id: tutor.id });
      setIsFavorite(true);
      toast({ title: 'Saved!', description: 'Tutor added to favorites' });
    }
    setFavoriteLoading(false);
  };

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${profile?.full_name} - Tutor Profile`, url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link Copied!', description: 'Profile link copied to clipboard' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tutor || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Tutor Not Found</h2>
            <Link to="/tutors"><Button>Browse Tutors</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const districtName = tutor.districts?.name_en || profile.districts?.name_en;
  const areaName = tutor.areas?.name_en || profile.areas?.name_en;
  const locationText = [areaName, districtName].filter(Boolean).join(', ');

  const teachingModeMeta: Record<string, { label: string; Icon: typeof Monitor }> = {
    online: { label: 'Online', Icon: Monitor },
    in_person: { label: 'In Person', Icon: Home },
    hybrid: { label: 'Online & In-Person', Icon: Users },
  };
  const modeInfo = teachingModeMeta[tutor.teaching_mode] || { label: tutor.teaching_mode, Icon: BookOpen };

  const ActionsBlock = (
    <div className="space-y-3">
      {user ? (
        role === 'parent' ? (
          <>
            <BookDemoClassDialog
              tutorId={tutor.id}
              tutorName={profile.full_name}
              hourlyRateMin={tutor.monthly_salary_min}
              hourlyRateMax={tutor.monthly_salary_max}
              subjects={subjects}
            />
            <Button variant={isFavorite ? 'secondary' : 'outline'} className="w-full" onClick={toggleFavorite} disabled={favoriteLoading}>
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current text-destructive' : ''}`} />
              {isFavorite ? 'Saved' : 'Add to Favorites'}
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center">Only parents can book demo classes.</p>
        )
      ) : (
        <Link to="/auth" className="block">
          <Button className="w-full" size="lg">
            <User className="h-4 w-4 mr-2" /> Login to Book Demo
          </Button>
        </Link>
      )}
      <Button variant="ghost" className="w-full" onClick={shareProfile}>
        <Share2 className="h-4 w-4 mr-2" /> Share
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />

      {/* HERO */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border/60">
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-[1200px]">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 ring-4 ring-background shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {profile.full_name?.charAt(0) || 'T'}
                </AvatarFallback>
              </Avatar>
              {tutor.verification_status === 'approved' && tutor.verification_paid && (
                <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground rounded-full p-1.5 ring-2 ring-background">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight break-words">{profile.full_name}</h1>
                {profile.user_reference && (
                  <Badge variant="outline" className="font-mono text-[10px]">{profile.user_reference}</Badge>
                )}
                {tutor.is_featured && (
                  <Badge className="bg-accent text-accent-foreground"><Award className="h-3 w-3 mr-1" />Featured</Badge>
                )}
                {tutor.is_available ? (
                  <Badge variant="outline" className="text-success border-success">● Available</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Unavailable</Badge>
                )}
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
                {locationText && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{locationText}</span>
                )}
                <span className="flex items-center gap-1.5"><modeInfo.Icon className="h-4 w-4" />{modeInfo.label}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{tutor.experience_years || 0} yrs experience</span>
                <span className="capitalize flex items-center gap-1.5"><User className="h-4 w-4" />{tutor.gender}</span>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                <div className="text-base">
                  <span className="font-bold text-primary text-xl">৳{tutor.monthly_salary_min || 0}–{tutor.monthly_salary_max || 0}</span>
                  <span className="text-muted-foreground text-xs ml-1">/month</span>
                </div>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                  {subjects.slice(0, 6).map(s => (
                    <Badge key={s.id} variant="secondary" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />{s.name_en}</Badge>
                  ))}
                  {subjects.length > 6 && <Badge variant="outline" className="text-xs">+{subjects.length - 6} more</Badge>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-[1200px]">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 min-w-0">

            {/* SUMMARY */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" /> Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tutor.featured_blurb && (
                  <div className="flex gap-3 p-3 rounded-lg border border-accent/40 bg-accent/5">
                    <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed font-medium">{tutor.featured_blurb}</p>
                  </div>
                )}
                {tutor.bio && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{tutor.bio}</p>
                )}
                {tutor.teaching_philosophy && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Teaching Philosophy</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">{tutor.teaching_philosophy}</p>
                  </div>
                )}
                {tutor.success_stories && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Success Stories</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">{tutor.success_stories}</p>
                  </div>
                )}
                {!tutor.bio && !tutor.teaching_philosophy && !tutor.success_stories && !tutor.featured_blurb && (
                  <p className="text-sm text-muted-foreground italic">No summary provided yet.</p>
                )}
              </CardContent>
            </Card>

            {/* SERVICES */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" /> Services & Subjects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Subjects Taught</h4>
                  {subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map(s => (
                        <Badge key={s.id} variant="secondary" className="text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />{s.name_en}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No subjects listed.</p>
                  )}
                </div>
                <Separator />
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <modeInfo.Icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Teaching Mode</div>
                      <div className="font-medium">{modeInfo.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Experience</div>
                      <div className="font-medium">{tutor.experience_years || 0} years</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FEES */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-primary" /> Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-primary">৳{tutor.monthly_salary_min || 0}–{tutor.monthly_salary_max || 0}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Final fee may vary based on subjects, class level, schedule, and location. Confirm with the tutor during the demo class.
                </p>
              </CardContent>
            </Card>

            {/* AVAILABILITY */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <div className={`h-2.5 w-2.5 rounded-full ${tutor.is_available ? 'bg-success' : 'bg-muted-foreground'}`} />
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="font-medium">{tutor.is_available ? 'Available for new students' : 'Not currently accepting'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div className="font-medium">{locationText || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Verification</div>
                      <div className="font-medium capitalize">{tutor.verification_status}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Member Since</div>
                      <div className="font-medium">{formatExactDate(new Date(tutor.created_at))}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EDUCATION */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-primary" /> Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const FIXED = ['SSC', 'HSC', 'Bachelor', 'Masters'];
                  const filled = FIXED.map(deg => ({
                    deg,
                    entry: educationEntries.find(e => (e.degree || '').toLowerCase() === deg.toLowerCase()),
                  })).filter(x => x.entry?.institution?.trim());

                  if (filled.length === 0) {
                    return <p className="text-muted-foreground text-sm">{tutor.education || 'No education details provided yet.'}</p>;
                  }
                  const labels: Record<string, string> = { SSC: 'Secondary School Certificate', HSC: 'Higher School Certificate', Bachelor: 'Bachelor', Masters: 'Masters' };
                  return (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {filled.map(({ deg, entry }) => (
                        <div key={deg} className="border border-border/60 rounded-xl p-3 bg-muted/30">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Badge variant="secondary" className="text-[10px] font-semibold">{deg}</Badge>
                            {entry!.passing_year && <span className="text-[11px] text-muted-foreground">{entry!.passing_year}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{labels[deg]}</p>
                          <p className="font-medium text-sm mt-1">{entry!.institution}</p>
                          {entry!.field_of_study && (
                            <p className="text-xs text-muted-foreground mt-0.5">{(deg === 'SSC' || deg === 'HSC') ? 'Group: ' : 'Field: '}{entry!.field_of_study}</p>
                          )}
                          {entry!.result && <p className="text-xs text-muted-foreground mt-0.5">Result: {entry!.result}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* VIDEO */}
            {tutor.video_url && (() => {
              const ytMatch = tutor.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              const vimeoMatch = tutor.video_url?.match(/(?:vimeo\.com\/)(\d+)/);
              const embedUrl = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : null;
              if (!embedUrl) return null;
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Video className="h-4 w-4 text-primary" /> Video Introduction
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                      <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Tutor Introduction Video" />
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Sidebar — desktop summary */}
          <aside className="hidden lg:block min-w-0">
            <Card className="sticky top-20">
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Fee</p>
                  <div className="text-2xl font-bold text-primary">৳{tutor.monthly_salary_min || 0}–{tutor.monthly_salary_max || 0}</div>
                </div>
                <Separator />
                {ActionsBlock}
                <Separator />
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium text-right">{locationText || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{modeInfo.label}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="font-medium">{tutor.experience_years}y</span></div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Related Tutors */}
      {relatedTutors.length > 0 && (
        <section className="container mx-auto px-4 md:px-6 pb-12 max-w-[1200px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Related Tutors
            </h2>
            {districtName && (
              <Link to={`/tutors?district=${tutor.district_id}`} className="text-sm text-primary hover:underline">
                View all in {districtName} →
              </Link>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedTutors.map((rt: any) => {
              const name = rt.profiles?.full_name || rt.display_name || 'Tutor';
              const snippet = rt.bio || '';
              return (
                <Link key={rt.id} to={`/tutor/${rt.slug || rt.id}`} className="group block">
                  <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={rt.profiles?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-primary">{name}</p>
                          <p className="text-xs text-muted-foreground">{rt.experience_years || 0} yrs exp</p>
                        </div>
                      </div>
                      {snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{snippet}</p>
                      )}
                      <p className="text-sm font-bold text-primary">৳{rt.monthly_salary_min || 0}–{rt.monthly_salary_max || 0}<span className="text-[10px] text-muted-foreground font-normal ml-1">/month</span></p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3 shadow-[0_-4px_20px_-8px_hsl(var(--foreground)/0.15)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none">Monthly Fee</p>
            <p className="font-bold text-primary text-base leading-tight">৳{tutor.monthly_salary_min || 0}–{tutor.monthly_salary_max || 0}</p>
          </div>
          <div className="flex-shrink-0 min-w-[180px]">{ActionsBlock}</div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
