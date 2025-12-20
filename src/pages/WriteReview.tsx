import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowLeft, Globe, Star } from 'lucide-react';

export default function WriteReview() {
  const { tutorId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tutorInfo, setTutorInfo] = useState<{ name: string; avatar: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (tutorId) {
      fetchTutorInfo();
    }
  }, [user, authLoading, tutorId]);

  const fetchTutorInfo = async () => {
    const { data } = await supabase
      .from('tutor_profiles')
      .select('user_id, profiles:user_id (full_name, avatar_url)')
      .eq('id', tutorId)
      .single();

    if (data) {
      setTutorInfo({
        name: (data.profiles as any)?.full_name || 'Unknown Tutor',
        avatar: (data.profiles as any)?.avatar_url || '',
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tutorId || rating === 0) return;

    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert({
      tutor_id: tutorId,
      parent_id: user.id,
      rating,
      comment,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Review Submitted!', description: 'Thank you for your feedback.' });
      navigate(-1);
    }

    setSubmitting(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={tutorInfo?.avatar} />
              <AvatarFallback className="text-2xl">{tutorInfo?.name?.charAt(0) || 'T'}</AvatarFallback>
            </Avatar>
            <CardTitle>Rate Your Experience</CardTitle>
            <CardDescription>Leave a review for {tutorInfo?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div className="text-center">
                <Label className="mb-3 block">Your Rating</Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-accent text-accent'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Fair'}
                    {rating === 3 && 'Good'}
                    {rating === 4 && 'Very Good'}
                    {rating === 5 && 'Excellent'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <Label>Your Review (Optional)</Label>
                <Textarea
                  placeholder="Share your experience with this tutor..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || rating === 0}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
