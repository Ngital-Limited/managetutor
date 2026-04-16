import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  GraduationCap, Globe, MapPin, Star, CheckCircle2, Clock, Heart,
  Briefcase, BookOpen, User, Calendar, DollarSign,
  Award, Users, ArrowLeft, Share2, Video, Lightbulb, Trophy
} from 'lucide-react';
import BookDemoClassDialog from '@/components/BookDemoClassDialog';

interface TutorProfile {
  id: string;
  user_id: string;
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
  created_at: string;
  video_url: string | null;
  teaching_philosophy: string | null;
  success_stories: string | null;
}

interface Profile {
  full_name: string;
  avatar_url: string;
  district_id: string;
  user_reference: string | null;
  districts: { name_en: string; name_bn: string } | null;
}

interface Subject {
  id: string;
  name_en: string;
  name_bn: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: { full_name: string; avatar_url: string };
}

export default function TutorPublicProfile() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (id) fetchTutorData();
  }, [id, user]);

  const fetchTutorData = async () => {
    // Try fetching by tutor_profiles.id first, then by user_id
    let { data: tutorData } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!tutorData) {
      const { data: byUserId } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      tutorData = byUserId;
    }

    if (!tutorData) {
      setLoading(false);
      return;
    }

    setTutor(tutorData as unknown as TutorProfile);

    // Fetch user profile with district
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, district_id, user_reference, districts (name_en, name_bn)')
      .eq('id', tutorData.user_id)
      .maybeSingle();

    setProfile(profileData as unknown as Profile || {
      full_name: tutorData.display_name || 'Tutor',
      avatar_url: '',
      district_id: tutorData.district_id || '',
      districts: null,
    } as Profile);

    // Fetch subjects
    const { data: subjectsData } = await supabase
      .from('tutor_subjects')
      .select('subjects (id, name_en, name_bn)')
      .eq('tutor_profile_id', id);

    if (subjectsData) {
      setSubjects(subjectsData.map(s => (s as any).subjects).filter(Boolean));
    }

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, profiles:parent_id (full_name, avatar_url)')
      .eq('tutor_id', id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsData) setReviews(reviewsData as unknown as Review[]);

    // Check if favorite
    if (user && role === 'parent') {
      const { data: favData } = await supabase
        .from('favorites')
        .select('id')
        .eq('parent_id', user.id)
        .eq('tutor_id', id)
        .maybeSingle();

      setIsFavorite(!!favData);
    }

    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user || !id) {
      toast({ title: 'Login Required', description: 'Please login to save tutors', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    setFavoriteLoading(true);

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('parent_id', user.id).eq('tutor_id', id);
      setIsFavorite(false);
      toast({ title: 'Removed', description: 'Tutor removed from favorites' });
    } else {
      await supabase.from('favorites').insert({ parent_id: user.id, tutor_id: id });
      setIsFavorite(true);
      toast({ title: 'Saved!', description: 'Tutor added to favorites' });
    }

    setFavoriteLoading(false);
  };

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `${profile?.full_name} - Tutor Profile`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link Copied!', description: 'Profile link copied to clipboard' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tutor || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Tutor Not Found</h2>
          <Link to="/tutors"><Button>Browse Tutors</Button></Link>
        </div>
      </div>
    );
  }

  const districtName = profile.districts?.name_en;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta would be handled by a helmet component in production */}
      
      {/* Navigation */}
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            <Card className={tutor.is_featured ? 'border-2 border-accent shadow-lg shadow-accent/10' : ''}>
              <CardContent className="p-6">
                {tutor.is_featured && (
                  <Badge className="bg-accent text-accent-foreground mb-4">
                    <Award className="h-3 w-3 mr-1" />
                    Featured Tutor
                  </Badge>
                )}
                
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {profile.full_name?.charAt(0) || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                      {profile.user_reference && (
                        <Badge variant="outline" className="font-mono text-xs">{profile.user_reference}</Badge>
                      )}
                      {tutor.verification_status === 'approved' && tutor.verification_paid && (
                        <Badge className="bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                      )}
                      {tutor.is_available ? (
                        <Badge variant="outline" className="text-success border-success">Available</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not Available</Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground flex items-center gap-2 mb-3">
                      {districtName && (
                        <>
                          <MapPin className="h-4 w-4" />
                          {districtName}
                        </>
                      )}
                      <span className="text-border">•</span>
                      <span className="capitalize">{tutor.gender}</span>
                      <span className="text-border">•</span>
                      <span className="capitalize">{tutor.teaching_mode?.replace('_', ' ')}</span>
                    </p>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-accent text-accent" />
                        <span className="font-bold text-lg">{tutor.average_rating || 0}</span>
                        <span className="text-muted-foreground">({tutor.total_reviews} reviews)</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        {tutor.experience_years} years exp
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {tutor.total_students} students
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                {subjects.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Subjects</h3>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map(subject => (
                        <Badge key={subject.id} variant="secondary">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {subject.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {tutor.bio || 'No bio provided yet.'}
                </p>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {tutor.education || 'No education details provided yet.'}
                </p>
              </CardContent>
            </Card>

            {/* Video Introduction */}
            {tutor.video_url && (() => {
              const ytMatch = tutor.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              const vimeoMatch = tutor.video_url?.match(/(?:vimeo\.com\/)(\d+)/);
              const embedUrl = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : null;
              if (!embedUrl) return null;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Video Introduction
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-xl overflow-hidden">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="Tutor Introduction Video"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Teaching Philosophy */}
            {tutor.teaching_philosophy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Teaching Philosophy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{tutor.teaching_philosophy}</p>
                </CardContent>
              </Card>
            )}

            {/* Success Stories */}
            {tutor.success_stories && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Success Stories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{tutor.success_stories}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Reviews ({tutor.total_reviews})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.profiles?.avatar_url} />
                            <AvatarFallback>{review.profiles?.full_name?.charAt(0) || 'P'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{review.profiles?.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
                                />
                              ))}
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing & Actions */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-primary">
                    ৳{tutor.monthly_salary_min || 0} - {tutor.monthly_salary_max || 0}
                  </div>
                  <p className="text-muted-foreground text-sm">per month</p>
                </div>

                <div className="space-y-3">
                  {user ? (
                    <>
                      
                      {role === 'parent' && (
                        <>
                          <BookDemoClassDialog
                            tutorId={tutor.id}
                            tutorName={profile.full_name}
                            hourlyRateMin={tutor.monthly_salary_min}
                            hourlyRateMax={tutor.monthly_salary_max}
                            subjects={subjects}
                          />
                          <Button
                            variant={isFavorite ? 'secondary' : 'outline'}
                            className="w-full"
                            onClick={toggleFavorite}
                            disabled={favoriteLoading}
                          >
                            <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current text-destructive' : ''}`} />
                            {isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">Login to view contact details and message this tutor</p>
                      <Link to="/auth">
                        <Button className="w-full" size="lg">
                          <User className="h-4 w-4 mr-2" />
                          Login to Contact
                        </Button>
                      </Link>
                    </div>
                  )}

                  <Button variant="ghost" className="w-full" onClick={shareProfile}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                </div>

                <Separator className="my-6" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium">{tutor.experience_years} years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Students Taught</span>
                    <span className="font-medium">{tutor.total_students}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Teaching Mode</span>
                    <span className="font-medium capitalize">{tutor.teaching_mode?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(tutor.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
