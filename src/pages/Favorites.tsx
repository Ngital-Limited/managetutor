import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  GraduationCap, ArrowLeft, Globe, Heart, Star, MapPin, Trash2
} from 'lucide-react';

interface Favorite {
  id: string;
  tutor_id: string;
  created_at: string;
  tutor_profiles: {
    id: string;
    user_id: string;
    average_rating: number;
    total_reviews: number;
    experience_years: number;
    hourly_rate_min: number;
    hourly_rate_max: number;
    verification_status: string;
    profiles: { full_name: string; avatar_url: string; districts: { name_en: string } | null };
    tutor_subjects: { subjects: { name_en: string } }[];
  };
}

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchFavorites();
    }
  }, [user, authLoading]);

  const fetchFavorites = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select(`
        *,
        tutor_profiles (
          id, user_id, average_rating, total_reviews, experience_years, hourly_rate_min, hourly_rate_max, verification_status,
          profiles:user_id (full_name, avatar_url, districts (name_en)),
          tutor_subjects (subjects (name_en))
        )
      `)
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setFavorites(data as unknown as Favorite[]);
    setLoading(false);
  };

  const removeFavorite = async (favoriteId: string) => {
    await supabase.from('favorites').delete().eq('id', favoriteId);
    setFavorites(prev => prev.filter(f => f.id !== favoriteId));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Favorites</h1>
            <p className="text-muted-foreground">{favorites.length} saved tutors</p>
          </div>
        </div>

        {favorites.length > 0 ? (
          <div className="space-y-4">
            {favorites.map(fav => (
              <Card key={fav.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Link to={`/tutor/${fav.tutor_id}`}>
                      <Avatar className="h-16 w-16 ring-2 ring-primary/10">
                        <AvatarImage src={fav.tutor_profiles?.profiles?.avatar_url} />
                        <AvatarFallback>{fav.tutor_profiles?.profiles?.full_name?.charAt(0) || 'T'}</AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1">
                      <Link to={`/tutor/${fav.tutor_id}`} className="hover:text-primary">
                        <h3 className="font-bold text-lg">{fav.tutor_profiles?.profiles?.full_name}</h3>
                      </Link>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        {fav.tutor_profiles?.profiles?.districts && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {fav.tutor_profiles.profiles.districts.name_en}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-accent">
                          <Star className="h-3 w-3 fill-current" />
                          {fav.tutor_profiles?.average_rating || 0}
                        </span>
                        <span>{fav.tutor_profiles?.experience_years || 0} yrs exp</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {fav.tutor_profiles?.tutor_subjects?.slice(0, 3).map((ts, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {ts.subjects?.name_en}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-primary mb-2">
                        ৳{fav.tutor_profiles?.hourly_rate_min}-{fav.tutor_profiles?.hourly_rate_max}/hr
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => removeFavorite(fav.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6">Save tutors you're interested in to view them later</p>
              <Link to="/tutors">
                <Button>Browse Tutors</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
