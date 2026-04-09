import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, Search, MapPin, Star, Filter, Globe, 
  User, Clock, BookOpen, CheckCircle2, X, ChevronDown, Heart, Award, ArrowRight, ChevronLeft, ChevronRight,
  Briefcase, DollarSign
} from 'lucide-react';

interface District {
  id: string;
  name_en: string;
  name_bn: string;
  division_en: string;
}

interface Subject {
  id: string;
  name_en: string;
  name_bn: string;
  category_en: string;
}

interface TutorProfile {
  id: string;
  user_id: string;
  bio: string;
  education: string;
  experience_years: number;
  hourly_rate_min: number;
  hourly_rate_max: number;
  teaching_mode: string;
  gender: string;
  is_available: boolean;
  is_featured: boolean;
  verification_status: string;
  average_rating: number;
  total_reviews: number;
  display_name: string | null;
  district_id: string | null;
  districts: { name_en: string; name_bn: string } | null;
  profiles: {
    full_name: string;
    avatar_url: string;
    district_id: string;
    districts?: { name_en: string; name_bn: string };
  } | null;
  tutor_subjects: { subjects: Subject }[];
}

export default function FindTutors() {
  const [searchParams] = useSearchParams();
  const { t, language, setLanguage } = useLanguage();
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [districts, setDistricts] = useState<District[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [featuredTutors, setFeaturedTutors] = useState<TutorProfile[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const TUTORS_PER_PAGE = 12;

  // Filters from URL or state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(searchParams.get('district') || '');
  const [selectedSubject, setSelectedSubject] = useState<string>(searchParams.get('subject') || '');
  const [selectedGender, setSelectedGender] = useState<string>(searchParams.get('gender') || '');
  const [selectedMode, setSelectedMode] = useState<string>(searchParams.get('mode') || '');
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [minRating, setMinRating] = useState<string>(searchParams.get('rating') || '');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(searchParams.get('verified') === 'true');
  const [sortBy, setSortBy] = useState<string>('rating');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [selectedDistrict, selectedSubject, selectedGender, selectedMode, priceRange, minRating, verifiedOnly, sortBy, currentPage]);

  useEffect(() => {
    if (user && role === 'parent') {
      fetchFavorites();
    }
  }, [user, role]);

  const fetchData = async () => {
    const [districtsRes, subjectsRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
    ]);
    
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    
    await fetchTutors();
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('tutor_id')
      .eq('parent_id', user.id);
    
    if (data) {
      setFavorites(new Set(data.map(f => f.tutor_id)));
    }
  };

  const fetchTutors = async () => {
    setLoading(true);
    
    // Count query
    let countQuery = supabase
      .from('tutor_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true);

    if (selectedGender && selectedGender !== 'any') {
      countQuery = countQuery.eq('gender', selectedGender as 'male' | 'female');
    }
    if (selectedMode && selectedMode !== 'any') {
      countQuery = countQuery.eq('teaching_mode', selectedMode as 'online' | 'in_person' | 'hybrid');
    }
    if (priceRange[0] > 0) {
      countQuery = countQuery.gte('hourly_rate_min', priceRange[0]);
    }
    if (priceRange[1] < 10000) {
      countQuery = countQuery.lte('hourly_rate_max', priceRange[1]);
    }
    if (minRating && minRating !== 'all') {
      countQuery = countQuery.gte('average_rating', parseFloat(minRating));
    }
    if (verifiedOnly) {
      countQuery = countQuery.eq('verification_status', 'approved');
    }

    const { count } = await countQuery;
    setTotalCount(count || 0);

    // Data query with pagination
    const from = (currentPage - 1) * TUTORS_PER_PAGE;
    const to = from + TUTORS_PER_PAGE - 1;
    
    let query = supabase
      .from('tutor_profiles')
      .select(`
        *,
        districts (name_en, name_bn),
        profiles!tutor_profiles_user_id_fkey (full_name, avatar_url, district_id, districts (name_en, name_bn)),
        tutor_subjects (subjects (*))
      `)
      .eq('is_available', true);

    if (selectedGender && selectedGender !== 'any') {
      query = query.eq('gender', selectedGender as 'male' | 'female');
    }

    if (selectedMode && selectedMode !== 'any') {
      query = query.eq('teaching_mode', selectedMode as 'online' | 'in_person' | 'hybrid');
    }

    if (priceRange[0] > 0) {
      query = query.gte('hourly_rate_min', priceRange[0]);
    }
    if (priceRange[1] < 10000) {
      query = query.lte('hourly_rate_max', priceRange[1]);
    }

    if (minRating && minRating !== 'all') {
      query = query.gte('average_rating', parseFloat(minRating));
    }
    if (verifiedOnly) {
      query = query.eq('verification_status', 'approved');
    }

    // Sorting
    if (sortBy === 'rating') {
      query = query.order('average_rating', { ascending: false });
    } else if (sortBy === 'experience') {
      query = query.order('experience_years', { ascending: false });
    } else if (sortBy === 'price_low') {
      query = query.order('hourly_rate_min', { ascending: true });
    } else if (sortBy === 'price_high') {
      query = query.order('hourly_rate_max', { ascending: false });
    }

    const { data } = await query.range(from, to);
    
    if (data) {
      let filtered = data as unknown as TutorProfile[];
      
      // Filter by district (client-side due to nested relation)
      if (selectedDistrict && selectedDistrict !== 'all') {
        filtered = filtered.filter(t => t.district_id === selectedDistrict || t.profiles?.district_id === selectedDistrict);
      }
      
      // Filter by subject
      if (selectedSubject && selectedSubject !== 'all') {
        filtered = filtered.filter(t => 
          t.tutor_subjects?.some(ts => ts.subjects?.id === selectedSubject)
        );
      }
      
      // Filter by search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t => 
          t.profiles?.full_name?.toLowerCase().includes(q) ||
          t.bio?.toLowerCase().includes(q) ||
          t.education?.toLowerCase().includes(q) ||
          t.tutor_subjects?.some(ts => ts.subjects?.name_en?.toLowerCase().includes(q))
        );
      }
      
      // Separate featured tutors
      const featured = filtered.filter(t => t.is_featured);
      const regular = filtered.filter(t => !t.is_featured);
      
      setFeaturedTutors(featured);
      setTutors(regular);
    }
    
    setLoading(false);
  };

  const toggleFavorite = async (tutorId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to save tutors', variant: 'destructive' });
      return;
    }

    const isFav = favorites.has(tutorId);
    
    if (isFav) {
      await supabase.from('favorites').delete().eq('parent_id', user.id).eq('tutor_id', tutorId);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(tutorId);
        return next;
      });
      toast({ title: 'Removed', description: 'Tutor removed from favorites' });
    } else {
      await supabase.from('favorites').insert({ parent_id: user.id, tutor_id: tutorId });
      setFavorites(prev => new Set(prev).add(tutorId));
      toast({ title: 'Saved!', description: 'Tutor added to favorites' });
    }
  };

  const clearFilters = () => {
    setSelectedDistrict('all');
    setSelectedSubject('all');
    setSelectedGender('any');
    setSelectedMode('any');
    setPriceRange([0, 10000]);
    setMinRating('all');
    setVerifiedOnly(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / TUTORS_PER_PAGE);

  const hasActiveFilters = (selectedDistrict && selectedDistrict !== 'all') || (selectedSubject && selectedSubject !== 'all') || (selectedGender && selectedGender !== 'any') || (selectedMode && selectedMode !== 'any') || (minRating && minRating !== 'all') || verifiedOnly || priceRange[0] > 0 || priceRange[1] < 10000;

  const TutorCard = ({ tutor, featured = false }: { tutor: TutorProfile; featured?: boolean }) => (
    <Link to={`/tutor/${tutor.id}`}>
      <Card className={`hover-lift overflow-hidden group h-full ${featured ? 'border-2 border-accent shadow-lg shadow-accent/10' : ''}`}>
        <CardContent className="p-6">
          {featured && (
            <Badge className="bg-accent text-accent-foreground mb-3">
              <Award className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          
          <div className="flex gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-primary/20">
              {tutor.profiles?.avatar_url ? (
                <img src={tutor.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {tutor.display_name || tutor.profiles?.full_name || 'Tutor'}
                  </h3>
                  {(tutor.districts || tutor.profiles?.districts) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {language === 'en' 
                        ? (tutor.districts?.name_en || tutor.profiles?.districts?.name_en)
                        : (tutor.districts?.name_bn || tutor.profiles?.districts?.name_bn)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {tutor.verification_status === 'approved' && (
                    <Badge className="bg-success/10 text-success border-0">
                      <CheckCircle2 className="h-3 w-3" />
                    </Badge>
                  )}
                  {role === 'parent' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => toggleFavorite(tutor.id, e)}
                    >
                      <Heart className={`h-4 w-4 ${favorites.has(tutor.id) ? 'fill-destructive text-destructive' : ''}`} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {tutor.bio || tutor.education || 'Experienced tutor ready to help you learn.'}
          </p>

          {tutor.tutor_subjects && tutor.tutor_subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tutor.tutor_subjects.slice(0, 3).map((ts, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {language === 'en' ? ts.subjects?.name_en : ts.subjects?.name_bn}
                </Badge>
              ))}
              {tutor.tutor_subjects.length > 3 && (
                <Badge variant="outline" className="text-xs">+{tutor.tutor_subjects.length - 3}</Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-accent">
                <Star className="h-4 w-4 fill-current" />
                {tutor.average_rating?.toFixed(1) || '0.0'}
                <span className="text-muted-foreground text-xs">({tutor.total_reviews})</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {tutor.experience_years || 0}y
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-primary">
                ৳{tutor.hourly_rate_min || 500}-{tutor.hourly_rate_max || 1500}
              </span>
              <span className="text-xs text-muted-foreground">/hr</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View Profile <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Manage Tutor</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/tutors" className="text-primary font-medium">Find Tutors</Link>
            <Link to="/jobs" className="text-muted-foreground hover:text-primary transition-colors font-medium">Browse Jobs</Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
              <Globe className="h-4 w-4 mr-1" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </Button>
            {user ? (
              <Link to="/dashboard">
                <Button>{t('nav.dashboard')}</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button>{t('nav.login')}</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Find Your Perfect Tutor</h1>
          <p className="text-lg opacity-90 max-w-2xl">Browse through our verified tutors and find the right match for your learning needs</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, subject, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTutors()}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {districts.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {language === 'en' ? d.name_en : d.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {language === 'en' ? s.name_en : s.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">!</Badge>}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Button className="h-12 rounded-xl px-8" onClick={fetchTutors}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Gender</Label>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Teaching Mode</Label>
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Min Rating</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="experience">Most Experienced</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Price: ৳{priceRange[0]} - ৳{priceRange[1]}/hr
                </Label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={10000}
                  step={500}
                  className="mt-3"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2 md:col-span-5">
                <Checkbox 
                  id="verified-only"
                  checked={verifiedOnly}
                  onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                />
                <Label htmlFor="verified-only" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Show Verified Tutors Only
                </Label>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Featured Tutors */}
        {featuredTutors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Featured Tutors
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTutors.map(tutor => (
                <TutorCard key={tutor.id} tutor={tutor} featured />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            {totalCount} tutors found
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-muted rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tutors.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutors.map(tutor => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : featuredTutors.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No tutors found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search criteria</p>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
