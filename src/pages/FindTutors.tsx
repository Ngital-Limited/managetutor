import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  GraduationCap, Search, MapPin, Star, Filter, Globe, 
  User, Clock, BookOpen, CheckCircle2, X, ChevronDown
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
  verification_status: string;
  average_rating: number;
  total_reviews: number;
  profiles: {
    full_name: string;
    avatar_url: string;
    district_id: string;
    districts?: { name_en: string; name_bn: string };
  };
  tutor_subjects: { subjects: Subject }[];
}

export default function FindTutors() {
  const { t, language, setLanguage } = useLanguage();
  const [districts, setDistricts] = useState<District[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [minRating, setMinRating] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTutors();
  }, [selectedDistrict, selectedSubject, selectedGender, priceRange, minRating]);

  const fetchData = async () => {
    const [districtsRes, subjectsRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
    ]);
    
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    
    await fetchTutors();
  };

  const fetchTutors = async () => {
    setLoading(true);
    
    let query = supabase
      .from('tutor_profiles')
      .select(`
        *,
        profiles!inner (full_name, avatar_url, district_id, districts (name_en, name_bn)),
        tutor_subjects (subjects (*))
      `)
      .eq('is_available', true);

    if (selectedGender && selectedGender !== 'any') {
      query = query.eq('gender', selectedGender as 'male' | 'female');
    }

    if (priceRange[0] > 0) {
      query = query.gte('hourly_rate_min', priceRange[0]);
    }
    if (priceRange[1] < 10000) {
      query = query.lte('hourly_rate_max', priceRange[1]);
    }

    if (minRating) {
      query = query.gte('average_rating', parseFloat(minRating));
    }

    const { data, error } = await query.limit(20);
    
    if (data) {
      let filtered = data as unknown as TutorProfile[];
      
      // Filter by district (client-side due to nested relation)
      if (selectedDistrict) {
        filtered = filtered.filter(t => t.profiles?.district_id === selectedDistrict);
      }
      
      // Filter by subject
      if (selectedSubject) {
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
          t.education?.toLowerCase().includes(q)
        );
      }
      
      setTutors(filtered);
    }
    
    setLoading(false);
  };

  const clearFilters = () => {
    setSelectedDistrict('');
    setSelectedSubject('');
    setSelectedGender('');
    setPriceRange([0, 10000]);
    setMinRating('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedDistrict || selectedSubject || selectedGender || minRating || priceRange[0] > 0 || priceRange[1] < 10000;

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
            <Link to="/auth">
              <Button>{t('nav.login')}</Button>
            </Link>
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
                <SelectItem value="">All Locations</SelectItem>
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
                <SelectItem value="">All Subjects</SelectItem>
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
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            <Button className="h-12 rounded-xl px-8" onClick={fetchTutors}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Gender Preference</Label>
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
                <Label className="text-sm font-medium mb-2 block">Minimum Rating</Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Rating</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium mb-2 block">
                  Price Range: ৳{priceRange[0]} - ৳{priceRange[1]}/hr
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

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">{tutors.length} tutors found</p>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.map((tutor) => (
              <Card key={tutor.id} className="hover-lift overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {tutor.profiles?.avatar_url ? (
                        <img src={tutor.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-foreground truncate">{tutor.profiles?.full_name || 'Tutor'}</h3>
                          {tutor.profiles?.districts && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {language === 'en' ? tutor.profiles.districts.name_en : tutor.profiles.districts.name_bn}
                            </p>
                          )}
                        </div>
                        {tutor.verification_status === 'approved' && (
                          <Badge className="bg-success/10 text-success border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
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
                      <span className="flex items-center gap-1 text-warning">
                        <Star className="h-4 w-4 fill-current" />
                        {tutor.average_rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {tutor.experience_years || 0}y exp
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">
                        ৳{tutor.hourly_rate_min || 500}-{tutor.hourly_rate_max || 1500}
                      </span>
                      <span className="text-xs text-muted-foreground">/hr</span>
                    </div>
                  </div>

                  <Button className="w-full mt-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No tutors found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search criteria</p>
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
