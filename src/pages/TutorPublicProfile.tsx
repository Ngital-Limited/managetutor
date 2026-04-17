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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap, MapPin, Star, CheckCircle2, Heart,
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
  average_rating: number;
  total_reviews: number;
  total_students: number;
  is_available: boolean;
  is_featured: boolean;
  verification_status: string;
  verification_paid: boolean;
  teaching_mode: string;
  gender: string;
  display_name: string | null;
  district_id: string | null;
  created_at: string;
  video_url: string | null;
  teaching_philosophy: string | null;
  success_stories: string | null;
  ai_overview: string | null;
}

interface Profile {
  full_name: string;
  avatar_url: string;
  district_id: string;
  user_reference: string | null;
  districts: { name_en: string; name_bn: string } | null;
  areas: { name_en: string; name_bn: string } | null;
}

interface Subject { id: string; name_en: string; name_bn: string; }
interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: { full_name: string; avatar_url: string };
}
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([]);
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

    if (UUID_REGEX.test(id)) {
      // Try id, then user_id
      const r1 = await supabase.from('tutor_profiles').select('*').eq('id', id).maybeSingle();
      tutorData = r1.data;
      if (!tutorData) {
        const r2 = await supabase.from('tutor_profiles').select('*').eq('user_id', id).maybeSingle();
        tutorData = r2.data;
      }
    } else {
      // Treat as slug
      const r = await supabase.from('tutor_profiles').select('*').eq('slug', id).maybeSingle();
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

    const [profileRes, subjectsRes, reviewsRes, eduRes] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, avatar_url, district_id, user_reference, districts (name_en, name_bn), areas (name_en, name_bn)')
        .eq('id', tutorData.user_id).maybeSingle(),
      supabase.from('tutor_subjects').select('subjects (id, name_en, name_bn)').eq('tutor_profile_id', tutorData.id),
      supabase.from('reviews')
        .select('*, profiles:parent_id (full_name, avatar_url)')
        .eq('tutor_id', tutorData.id).eq('is_approved', true)
        .order('created_at', { ascending: false }).limit(20),
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
    if (reviewsRes.data) setReviews(reviewsRes.data as unknown as Review[]);
    if (eduRes.data) setEducationEntries(eduRes.data as EducationEntry[]);

    if (user && role === 'parent') {
      const { data: favData } = await supabase
        .from('favorites').select('id')
        .eq('parent_id', user.id).eq('tutor_id', tutorData.id).maybeSingle();
      setIsFavorite(!!favData);
    }

    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user || !tutor) {
      toast({ title: 'Login Required', description: 'Please login to save tutors', variant: 'destructive' });
      navigate('/auth');
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

  const districtName = profile.districts?.name_en;
  const areaName = profile.areas?.name_en;
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
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="relative">
              <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-background shadow-lg">
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">{profile.full_name}</h1>
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

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
                {locationText && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{locationText}</span>
                )}
                <span className="flex items-center gap-1.5"><modeInfo.Icon className="h-4 w-4" />{modeInfo.label}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{tutor.experience_years || 0} yrs experience</span>
                <span className="capitalize flex items-center gap-1.5"><User className="h-4 w-4" />{tutor.gender}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-accent text-accent" />
                  <span className="font-bold text-lg">{tutor.average_rating || 0}</span>
                  <span className="text-muted-foreground text-sm">({tutor.total_reviews} reviews)</span>
                </div>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> {tutor.total_students} students taught
                </div>
                <Separator orientation="vertical" className="h-5 hidden sm:block" />
                <div className="text-base">
                  <span className="font-bold text-primary text-xl">৳{tutor.monthly_salary_min || 0}–{tutor.monthly_salary_max || 0}</span>
                  <span className="text-muted-foreground text-xs ml-1">/month</span>
                </div>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.slice(0, 6).map(s => (
                    <Badge key={s.id} variant="secondary" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />{s.name_en}</Badge>
                  ))}
                  {subjects.length > 6 && <Badge variant="outline" className="text-xs">+{subjects.length - 6} more</Badge>}
                </div>
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:block w-64 flex-shrink-0">
              <Card className="border-primary/20">
                <CardContent className="p-4">{ActionsBlock}</CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT WITH TABS */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto bg-muted/50">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                {tutor.video_url && <TabsTrigger value="video">Video</TabsTrigger>}
                <TabsTrigger value="reviews">Reviews ({tutor.total_reviews})</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-4 space-y-4">
                {tutor.ai_overview && (
                  <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Overview
                        <Badge variant="outline" className="text-[10px] font-normal ml-1">AI-generated</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{tutor.ai_overview}</p>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />About</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">{tutor.bio || 'No bio provided yet.'}</p>
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="education" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4" />Education</CardTitle></CardHeader>
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
              </TabsContent>

              {tutor.video_url && (() => {
                const ytMatch = tutor.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
                const vimeoMatch = tutor.video_url?.match(/(?:vimeo\.com\/)(\d+)/);
                const embedUrl = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : null;
                if (!embedUrl) return null;
                return (
                  <TabsContent value="video" className="mt-4">
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4" />Video Introduction</CardTitle></CardHeader>
                      <CardContent>
                        <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                          <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="Tutor Introduction Video" />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })()}

              <TabsContent value="reviews" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4" />Reviews</CardTitle></CardHeader>
                  <CardContent>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map(review => (
                          <div key={review.id} className="p-4 bg-muted/40 rounded-xl">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={review.profiles?.avatar_url} />
                                <AvatarFallback>{review.profiles?.full_name?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{review.profiles?.full_name}</span>
                                  <span className="text-[11px] text-muted-foreground">{formatExactDate(new Date(review.created_at))}</span>
                                </div>
                                <div className="flex items-center gap-0.5 mb-2">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                                  ))}
                                </div>
                                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">No reviews yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Quick Details</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div className="flex justify-between"><dt className="text-muted-foreground">Experience</dt><dd className="font-medium">{tutor.experience_years} years</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Students Taught</dt><dd className="font-medium">{tutor.total_students}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Teaching Mode</dt><dd className="font-medium">{modeInfo.label}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Gender</dt><dd className="font-medium capitalize">{tutor.gender}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">District</dt><dd className="font-medium">{districtName || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Area (Thana)</dt><dd className="font-medium">{areaName || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Member Since</dt><dd className="font-medium">{formatExactDate(new Date(tutor.created_at))}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted-foreground">Verification</dt><dd className="font-medium capitalize">{tutor.verification_status}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar — desktop summary */}
          <aside className="hidden lg:block">
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
