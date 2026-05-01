import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  GraduationCap, Globe, MapPin, User, Clock, BookOpen, CheckCircle2, ArrowRight
} from 'lucide-react';

interface District {
  id: string;
  name_en: string;
}

interface TutorProfile {
  id: string;
  bio: string;
  experience_years: number;
  monthly_salary_min: number;
  monthly_salary_max: number;
  // rating fields removed
  verification_status: string;
  verification_paid: boolean;
  profiles: {
    full_name: string;
    avatar_url: string;
    district_id: string;
    districts?: { name_en: string};
  };
  tutor_subjects: { subjects: { name_en: string} }[];
}

// SEO-optimized location landing page
export default function LocationTutors() {
  const { location } = useParams();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<District | null>(null);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [totalTutors, setTotalTutors] = useState(0);

  useEffect(() => {
    if (location) fetchData();
  }, [location]);

  const fetchData = async () => {
    // Find district by slug (name_en lowercased)
    const { data: districts } = await supabase
      .from('districts')
      .select('*')
      .ilike('name_en', location?.replace(/-/g, ' ') || '');

    if (districts && districts.length > 0) {
      setDistrict(districts[0]);

      // Fetch tutors in this district
      const { data: tutorData, count } = await supabase
        .from('tutor_profiles_public')
        .select(`
          *,
          profiles:user_id!inner (full_name, avatar_url, district_id, districts (name_en)),
          tutor_subjects (subjects (name_en))
        `, { count: 'exact' })
        .eq('is_available', true)
        .eq('profiles.district_id', districts[0].id)
        .order('is_featured', { ascending: false })
        .limit(12);

      if (tutorData) setTutors(tutorData as unknown as TutorProfile[]);
      if (count) setTotalTutors(count);
    }

    setLoading(false);
  };

  const locationName = district?.name_en;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      {/* Hero Section - SEO Optimized */}
      <section className="gradient-hero text-primary-foreground py-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="text-sm mb-4 opacity-80">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/tutors" className="hover:underline">Tutors</Link>
            <span className="mx-2">/</span>
            <span>{locationName}</span>
          </nav>
          
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Home Tutors in {locationName}
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-3xl mb-6">
            Find the best private tutors in {locationName}. {totalTutors}+ verified tutors available for home tuition, online classes, and exam preparation.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to={`/tutors?district=${district?.id}`}>
              <Button size="lg" variant="secondary">
                View All {totalTutors} Tutors
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/jobs">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10">
                Post a Tuition Job
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{totalTutors}+</div>
              <div className="text-sm text-muted-foreground">Verified Tutors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Subjects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">4.8</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">1000+</div>
              <div className="text-sm text-muted-foreground">Successful Matches</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tutors Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold mb-6">Top Rated Tutors in {locationName}</h2>
          
          {loading ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4" />
                    <div className="h-5 bg-muted rounded w-3/4 mx-auto mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tutors.length > 0 ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tutors.map(tutor => (
                <Link key={tutor.id} to={`/tutor/${(tutor as any).slug || tutor.id}`}>
                  <Card className="hover-lift h-full">
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                        {tutor.profiles?.avatar_url ? (
                          <img src={tutor.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 text-primary" />
                        )}
                      </div>
                      
                      <h3 className="font-bold mb-1">{tutor.profiles?.full_name}</h3>
                      
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
                        <span>{tutor.experience_years}y exp</span>
                      </div>

                      {tutor.verification_status === 'approved' && tutor.verification_paid && (
                        <Badge className="bg-success/10 text-success border-0 mb-3">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}

                      <div className="flex flex-wrap justify-center gap-1 mb-4">
                        {tutor.tutor_subjects?.slice(0, 2).map((ts, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {ts.subjects?.name_en}
                          </Badge>
                        ))}
                      </div>

                      <div className="font-bold text-primary">
                        ৳{tutor.monthly_salary_min}-{tutor.monthly_salary_max}/mo
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No tutors found in {locationName} yet.</p>
              <Link to="/tutors">
                <Button>Browse All Tutors</Button>
              </Link>
            </div>
          )}

          {tutors.length > 0 && totalTutors > 12 && (
            <div className="text-center mt-8">
              <Link to={`/tutors?district=${district?.id}`}>
                <Button size="lg">
                  View All {totalTutors} Tutors in {locationName}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6 max-w-[1200px]">
          <h2 className="text-2xl font-bold mb-6">Why Choose Our Tutors in {locationName}?</h2>
          
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p>
              Looking for qualified home tutors in {locationName}? Manage Tutor connects you with 
              verified, experienced tutors who can help your child excel in academics. Whether you need 
              help with school subjects, board exam preparation, or competitive exam coaching, we have 
              the right tutor for you.
            </p>

            <h3 className="text-xl font-bold text-foreground mt-6 mb-3">Popular Subjects in {locationName}</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Mathematics - Class 1 to University Level</li>
              <li>Physics, Chemistry, Biology</li>
              <li>English Language & Literature</li>
              <li>IELTS & TOEFL Preparation</li>
              <li>HSC & SSC Board Exam Coaching</li>
              <li>University Admission Test Prep</li>
            </ul>

            <h3 className="text-xl font-bold text-foreground mt-6 mb-3">How It Works</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Browse tutors in {locationName} based on subject and experience</li>
              <li>Post your tuition requirement for free</li>
              <li>Receive applications from qualified tutors</li>
              <li>Chat with tutors and hire the best fit</li>
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Find Your Perfect Tutor?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of parents and students who found their ideal tutors through Manage Tutor
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/tutors">
              <Button size="lg">Browse Tutors</Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">Post a Job</Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
