import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';
import { 
  Search, MapPin, Star, Filter, 
  User, Clock, CheckCircle2, X, ChevronDown, Heart, Award, ArrowRight, ChevronLeft, ChevronRight
} from 'lucide-react';

interface District {
  id: string;
  name_en: string;
  name_bn: string;
  division_en: string;
  division_bn: string;
}

interface Area {
  id: string;
  name_en: string;
  name_bn: string;
  district_id: string;
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
  class_levels: string[] | null;
  districts: { name_en: string; name_bn: string; division_en: string } | null;
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
  const { language } = useLanguage();
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTutors, setAllTutors] = useState<TutorProfile[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const TUTORS_PER_PAGE = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>(searchParams.get('gender') || '');
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(searchParams.get('verified') === 'true');

  // Derived: unique divisions
  const divisions = useMemo(() => {
    const divSet = new Map<string, string>();
    districts.forEach(d => {
      if (!divSet.has(d.division_en)) {
        divSet.set(d.division_en, d.division_bn);
      }
    });
    return Array.from(divSet.entries()).map(([en, bn]) => ({ en, bn })).sort((a, b) => a.en.localeCompare(b.en));
  }, [districts]);

  // Derived: districts filtered by division + search
  const filteredDistricts = useMemo(() => {
    let list = districts;
    if (selectedDivision) {
      list = list.filter(d => d.division_en === selectedDivision);
    }
    if (districtSearch) {
      const q = districtSearch.toLowerCase();
      list = list.filter(d => d.name_en.toLowerCase().includes(q) || d.name_bn.includes(q));
    }
    return list.sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [districts, selectedDivision, districtSearch]);

  // Derived: areas filtered by selected district + search
  const filteredAreas = useMemo(() => {
    let list = areas;
    if (selectedDistrict) {
      list = list.filter(a => a.district_id === selectedDistrict);
    }
    if (areaSearch) {
      const q = areaSearch.toLowerCase();
      list = list.filter(a => a.name_en.toLowerCase().includes(q) || a.name_bn.includes(q));
    }
    return list.sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [areas, selectedDistrict, areaSearch]);

  useEffect(() => {
    fetchData();
  }, []);

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
    if (data) setFavorites(new Set(data.map(f => f.tutor_id)));
  };

  const fetchTutors = async () => {
    setLoading(true);
    
    let query = supabase
      .from('tutor_profiles')
      .select(`
        *,
        districts (name_en, name_bn, division_en),
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
    if (verifiedOnly) {
      query = query.eq('verification_status', 'approved');
    }

    const { data } = await query.order('is_featured', { ascending: false }).order('average_rating', { ascending: false });
    
    if (data && data.length > 0) {
      const userIds = data.map((t: any) => t.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, district_id, districts (name_en, name_bn)')
        .in('id', userIds);

      const profilesMap = new Map<string, any>();
      if (profilesData) {
        profilesData.forEach((p: any) => profilesMap.set(p.id, p));
      }

      const merged = (data as unknown as TutorProfile[]).map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || null,
      }));
      
      setAllTutors(merged);
    } else {
      setAllTutors([]);
    }
    
    setLoading(false);
  };

  // Client-side filtering for category, background, division, city, search
  const filteredTutors = useMemo(() => {
    let result = [...allTutors];

    // Filter by category (match against subject category_en)
    if (selectedCategory) {
      result = result.filter(t =>
        t.tutor_subjects?.some(ts => ts.subjects?.category_en === selectedCategory)
      );
    }

    // Filter by background - match against class_levels or subject category
    if (selectedBackground) {
      result = result.filter(t =>
        t.class_levels?.some(cl => cl.toLowerCase().includes(selectedBackground.toLowerCase())) ||
        t.tutor_subjects?.some(ts => ts.subjects?.category_en?.toLowerCase().includes(selectedBackground.toLowerCase()))
      );
    }

    // Filter by division
    if (selectedDivision) {
      result = result.filter(t => {
        const dist = t.districts as any;
        return dist?.division_en === selectedDivision;
      });
    }

    // Filter by city (district)
    if (selectedCity && selectedCity !== 'all') {
      result = result.filter(t => t.district_id === selectedCity || t.profiles?.district_id === selectedCity);
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.profiles?.full_name?.toLowerCase().includes(q) ||
        t.display_name?.toLowerCase().includes(q) ||
        t.bio?.toLowerCase().includes(q) ||
        t.education?.toLowerCase().includes(q) ||
        t.tutor_subjects?.some(ts => ts.subjects?.name_en?.toLowerCase().includes(q))
      );
    }

    // Sort: featured first, then by rating
    result.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (b.average_rating || 0) - (a.average_rating || 0);
    });

    return result;
  }, [allTutors, selectedCategory, selectedBackground, selectedDivision, selectedCity, searchQuery]);

  const totalCount = filteredTutors.length;
  const totalPages = Math.ceil(totalCount / TUTORS_PER_PAGE);
  const paginatedTutors = filteredTutors.slice((currentPage - 1) * TUTORS_PER_PAGE, currentPage * TUTORS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBackground, selectedGender, selectedDivision, selectedCity, priceRange, verifiedOnly, searchQuery]);

  // Re-fetch when server-side filters change
  useEffect(() => {
    if (districts.length > 0) {
      fetchTutors();
    }
  }, [selectedGender, priceRange, verifiedOnly]);

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
      setFavorites(prev => { const next = new Set(prev); next.delete(tutorId); return next; });
      toast({ title: 'Removed', description: 'Tutor removed from favorites' });
    } else {
      await supabase.from('favorites').insert({ parent_id: user.id, tutor_id: tutorId });
      setFavorites(prev => new Set(prev).add(tutorId));
      toast({ title: 'Saved!', description: 'Tutor added to favorites' });
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedBackground('');
    setSelectedGender('');
    setPriceRange([0, 10000]);
    setSelectedDivision('');
    setSelectedCity('');
    setCitySearch('');
    setVerifiedOnly(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = !!selectedCategory || !!selectedBackground || (selectedGender && selectedGender !== 'any') || !!selectedDivision || (selectedCity && selectedCity !== 'all') || verifiedOnly || priceRange[0] > 0 || priceRange[1] < 10000;

  const TutorCard = ({ tutor }: { tutor: TutorProfile }) => {
    const isFeatured = tutor.is_featured;
    return (
      <Link to={`/tutor/${tutor.id}`}>
        <Card className={`hover-lift overflow-hidden group h-full ${isFeatured ? 'border-2 border-accent shadow-lg shadow-accent/10' : ''}`}>
          <CardContent className="p-6">
            {isFeatured && (
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
                      <Badge className="bg-green-500 text-white border-0 gap-1 px-2 py-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Verified</span>
                      </Badge>
                    )}
                    {role === 'parent' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => toggleFavorite(tutor.id, e)}>
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
                  <Badge key={i} variant="secondary" className="text-xs">{ts.subjects?.name_en}</Badge>
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
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Find Your Perfect Tutor</h1>
          <p className="text-lg opacity-90 max-w-2xl">Browse through our verified tutors and find the right match for your learning needs</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-border mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, subject, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
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

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {JOB_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Background */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Background</Label>
                  <Select value={selectedBackground} onValueChange={setSelectedBackground}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="All Backgrounds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Backgrounds</SelectItem>
                      {STUDENT_BACKGROUNDS.map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tutor Gender */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tutor Gender</Label>
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

                {/* Salary Range */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Salary: ৳{priceRange[0]} - ৳{priceRange[1]}/hr
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

              {/* Location Row */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Country</Label>
                  <Input value="Bangladesh" disabled className="rounded-xl bg-muted/50" />
                </div>

                {/* Division */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Division</Label>
                  <Select value={selectedDivision} onValueChange={(v) => { setSelectedDivision(v === 'all' ? '' : v); setSelectedCity(''); }}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map(div => (
                        <SelectItem key={div.en} value={div.en}>
                          {language === 'en' ? div.en : div.bn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City with search */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">City</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="rounded-xl">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Search city (A-Z)..."
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          className="h-8 text-sm rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <SelectItem value="all">All Cities</SelectItem>
                      {filteredCities.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {language === 'en' ? d.name_en : d.name_bn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Verified Only */}
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="verified-only"
                  checked={verifiedOnly}
                  onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                />
                <Label htmlFor="verified-only" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
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

        {/* Results Count */}
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
        ) : paginatedTutors.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTutors.map(tutor => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-10">
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
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
      <Footer />
    </div>
  );
}
