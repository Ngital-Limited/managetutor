import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { JOB_CATEGORIES, STUDENT_BACKGROUNDS } from '@/constants/jobCategories';
import { 
  Search, MapPin, Star, Filter, 
  User, Clock, CheckCircle2, X, ChevronDown, Heart, Award, ArrowRight, ChevronLeft, ChevronRight,
  BookOpen, Monitor, Users, SlidersHorizontal, LayoutGrid, LayoutList, GraduationCap
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
  district_name?: string;
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
  slug: string | null;
  bio: string;
  ai_overview: string | null;
  education: string;
  experience_years: number;
  monthly_salary_min: number;
  monthly_salary_max: number;
  teaching_mode: string;
  gender: string;
  is_available: boolean;
  is_featured: boolean;
  verification_status: string;
  verification_paid: boolean;
  average_rating: number;
  total_reviews: number;
  total_students: number;
  display_name: string | null;
  district_id: string | null;
  class_levels: string[] | null;
  districts: { name_en: string; name_bn: string; division_en: string } | null;
  profiles: {
    full_name: string;
    avatar_url: string;
    district_id: string;
    districts?: { name_en: string; name_bn: string };
    areas?: { name_en: string; name_bn: string } | null;
  } | null;
  tutor_subjects: { subjects: Subject }[];
}

type SortOption = 'rating' | 'experience' | 'price_low' | 'price_high' | 'reviews';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  const TUTORS_PER_PAGE = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedBackground, setSelectedBackground] = useState<string>(searchParams.get('background') || '');
  const [selectedGender, setSelectedGender] = useState<string>(searchParams.get('gender') || '');
  const [priceRange, setPriceRange] = useState<number[]>([0, 10000]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>(searchParams.get('area') || '');
  const [districtSearch, setDistrictSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(searchParams.get('verified') === 'true');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

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

  const filteredDistricts = useMemo(() => {
    let list = districts;
    if (selectedDivision) list = list.filter(d => d.division_en === selectedDivision);
    if (districtSearch) {
      const q = districtSearch.toLowerCase();
      list = list.filter(d => d.name_en.toLowerCase().includes(q) || d.name_bn.includes(q));
    }
    return list.sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [districts, selectedDivision, districtSearch]);

  const filteredAreas = useMemo(() => {
    let list = areas;
    if (selectedDistrict) list = list.filter(a => a.district_id === selectedDistrict);
    if (areaSearch) {
      const q = areaSearch.toLowerCase();
      list = list.filter(a => a.name_en.toLowerCase().includes(q) || a.name_bn.includes(q));
    }
    return list.sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [areas, selectedDistrict, areaSearch]);

  // Unique subject list for filter
  const subjectOptions = useMemo(() => {
    return subjects.sort((a, b) => a.name_en.localeCompare(b.name_en));
  }, [subjects]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (user && role === 'parent') fetchFavorites();
  }, [user, role]);

  const fetchData = async () => {
    const [districtsRes, subjectsRes, areasRes] = await Promise.all([
      supabase.from('districts').select('*').order('name_en'),
      supabase.from('subjects').select('*').order('name_en'),
      supabase.from('areas').select('id, name_en, name_bn, district_id, districts (name_en)').order('name_en'),
    ]);
    if (districtsRes.data) setDistricts(districtsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (areasRes.data) {
      setAreas(areasRes.data.map((a: any) => ({
        id: a.id,
        name_en: a.name_en,
        name_bn: a.name_bn,
        district_id: a.district_id,
        district_name: a.districts?.name_en || '',
      })));
    }
    await fetchTutors();
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('tutor_id').eq('parent_id', user.id);
    if (data) setFavorites(new Set(data.map(f => f.tutor_id)));
  };

  const fetchTutors = async () => {
    setLoading(true);
    let query = supabase
      .from('tutor_profiles')
      .select(`*, districts (name_en, name_bn, division_en), tutor_subjects (subjects (*))`)
      .eq('is_available', true);

    if (selectedGender && selectedGender !== 'any') query = query.eq('gender', selectedGender as 'male' | 'female');
    if (priceRange[0] > 0) query = query.gte('monthly_salary_min', priceRange[0]);
    if (priceRange[1] < 10000) query = query.lte('monthly_salary_max', priceRange[1]);
    if (verifiedOnly) query = query.eq('verification_status', 'approved');

    const { data } = await query.order('is_featured', { ascending: false }).order('average_rating', { ascending: false });
    
    if (data && data.length > 0) {
      const userIds = data.map((t: any) => t.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, district_id, districts (name_en, name_bn), areas (name_en, name_bn)')
        .in('id', userIds);

      const profilesMap = new Map<string, any>();
      if (profilesData) profilesData.forEach((p: any) => profilesMap.set(p.id, p));

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

  const filteredTutors = useMemo(() => {
    let result = [...allTutors];

    if (selectedCategory) {
      result = result.filter(t => t.tutor_subjects?.some(ts => ts.subjects?.category_en === selectedCategory));
    }
    if (selectedBackground) {
      result = result.filter(t =>
        t.class_levels?.some(cl => cl.toLowerCase().includes(selectedBackground.toLowerCase())) ||
        t.tutor_subjects?.some(ts => ts.subjects?.category_en?.toLowerCase().includes(selectedBackground.toLowerCase()))
      );
    }
    if (selectedSubject) {
      result = result.filter(t => t.tutor_subjects?.some(ts => ts.subjects?.id === selectedSubject));
    }
    if (selectedDivision) {
      result = result.filter(t => (t.districts as any)?.division_en === selectedDivision);
    }
    if (selectedDistrict && selectedDistrict !== 'all') {
      result = result.filter(t => t.district_id === selectedDistrict || t.profiles?.district_id === selectedDistrict);
    }
    if (selectedArea) {
      const area = areas.find(a => a.id === selectedArea);
      if (area) {
        result = result.filter(t => t.district_id === area.district_id || t.profiles?.district_id === area.district_id);
      }
    }
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

    // Sort
    result.sort((a, b) => {
      // Featured always first
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      
      switch (sortBy) {
        case 'rating': return (b.average_rating || 0) - (a.average_rating || 0);
        case 'experience': return (b.experience_years || 0) - (a.experience_years || 0);
        case 'price_low': return (a.monthly_salary_min || 0) - (b.monthly_salary_min || 0);
        case 'price_high': return (b.monthly_salary_max || 0) - (a.monthly_salary_max || 0);
        case 'reviews': return (b.total_reviews || 0) - (a.total_reviews || 0);
        default: return 0;
      }
    });

    return result;
  }, [allTutors, selectedCategory, selectedBackground, selectedSubject, selectedDivision, selectedDistrict, selectedArea, areas, searchQuery, sortBy]);

  const totalCount = filteredTutors.length;
  const totalPages = Math.ceil(totalCount / TUTORS_PER_PAGE);
  const paginatedTutors = filteredTutors.slice((currentPage - 1) * TUTORS_PER_PAGE, currentPage * TUTORS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory, selectedBackground, selectedGender, selectedDivision, selectedDistrict, selectedArea, selectedSubject, priceRange, verifiedOnly, searchQuery, sortBy]);

  useEffect(() => {
    if (districts.length > 0) fetchTutors();
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
    setSelectedCategory(''); setSelectedBackground(''); setSelectedGender('');
    setPriceRange([0, 10000]); setSelectedDivision(''); setSelectedDistrict('');
    setSelectedArea(''); setDistrictSearch(''); setAreaSearch('');
    setVerifiedOnly(false); setSearchQuery(''); setSelectedSubject('');
    setCurrentPage(1);
  };

  const activeFilterCount = [selectedCategory, selectedBackground, (selectedGender && selectedGender !== 'any') ? selectedGender : '', selectedDivision, selectedDistrict, selectedArea, selectedSubject, verifiedOnly ? 'v' : '', priceRange[0] > 0 ? 'p' : '', priceRange[1] < 10000 ? 'p' : ''].filter(Boolean).length;

  const teachingModeLabel = (mode: string) => {
    switch (mode) {
      case 'online': return { label: 'Online', icon: Monitor };
      case 'in_person': return { label: 'In Person', icon: MapPin };
      case 'hybrid': return { label: 'Hybrid', icon: Users };
      default: return { label: mode, icon: BookOpen };
    }
  };

  const TutorCard = ({ tutor }: { tutor: TutorProfile }) => {
    const isFeatured = tutor.is_featured;
    const modeInfo = teachingModeLabel(tutor.teaching_mode);
    const ModeIcon = modeInfo.icon;

    if (viewMode === 'list') {
      return (
        <Link to={`/tutor/${tutor.slug || tutor.id}`}>
          <Card className={`hover:shadow-md transition-all group ${isFeatured ? 'border-accent/50 bg-accent/[0.02]' : ''}`}>
            <CardContent className="p-4 flex gap-4 items-center">
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden ring-2 ${isFeatured ? 'ring-accent/40' : 'ring-primary/10'} bg-primary/5 flex items-center justify-center`}>
                {tutor.profiles?.avatar_url ? (
                  <img src={tutor.profiles.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <User className="h-7 w-7 text-primary/60" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {tutor.display_name || tutor.profiles?.full_name || 'Tutor'}
                  </h3>
                  {isFeatured && <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0"><Award className="h-2.5 w-2.5 mr-0.5" />Featured</Badge>}
                  {tutor.verification_status === 'approved' && tutor.verification_paid && <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {(tutor.districts || tutor.profiles?.districts) && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{tutor.profiles?.areas?.name_en ? `${tutor.profiles.areas.name_en}, ` : ''}{tutor.districts?.name_en || tutor.profiles?.districts?.name_en}</span>
                  )}
                  <span className="flex items-center gap-1"><ModeIcon className="h-3 w-3" />{modeInfo.label}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{tutor.experience_years || 0}y exp</span>
                </div>
              </div>

              {/* Subjects */}
              <div className="hidden md:flex flex-wrap gap-1 max-w-[200px]">
                {tutor.tutor_subjects?.slice(0, 3).map((ts, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{ts.subjects?.name_en}</Badge>
                ))}
                {(tutor.tutor_subjects?.length || 0) > 3 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{(tutor.tutor_subjects?.length || 0) - 3}</Badge>}
              </div>

              {/* Rating & Price */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <span className="font-bold text-primary text-sm">৳{tutor.monthly_salary_min || 500}-{tutor.monthly_salary_max || 1500}</span>
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                </div>
                {role === 'parent' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => toggleFavorite(tutor.id, e)}>
                    <Heart className={`h-4 w-4 ${favorites.has(tutor.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    }

    // Grid view
    return (
      <Link to={`/tutor/${tutor.slug || tutor.id}`}>
        <Card className={`hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group h-full ${isFeatured ? 'border-accent/50 ring-1 ring-accent/20' : 'border-border'}`}>
          {isFeatured && (
            <div className="bg-gradient-to-r from-accent/10 to-primary/5 px-4 py-1.5 flex items-center gap-1.5 border-b border-accent/20">
              <Award className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent">Featured Tutor</span>
            </div>
          )}
          <CardContent className="p-5">
            <div className="flex gap-3.5 mb-3.5">
              <div className={`w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden ring-2 ${isFeatured ? 'ring-accent/30' : 'ring-primary/10'} bg-primary/5 flex items-center justify-center`}>
                {tutor.profiles?.avatar_url ? (
                  <img src={tutor.profiles.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <User className="h-7 w-7 text-primary/60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-[15px]">
                      {tutor.display_name || tutor.profiles?.full_name || 'Tutor'}
                    </h3>
                    {(tutor.districts || tutor.profiles?.districts) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{tutor.profiles?.areas?.name_en ? `${tutor.profiles.areas.name_en}, ` : ''}{tutor.districts?.name_en || tutor.profiles?.districts?.name_en}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {tutor.verification_status === 'approved' && tutor.verification_paid && (
                      <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                    )}
                    {role === 'parent' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => toggleFavorite(tutor.id, e)}>
                        <Heart className={`h-3.5 w-3.5 ${favorites.has(tutor.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {tutor.ai_overview
                ? tutor.ai_overview.split('\n').filter(Boolean).slice(0, 2).join(' ')
                : (tutor.bio || tutor.education || 'Experienced tutor ready to help you learn.')}
            </p>

            {/* Subjects */}
            {tutor.tutor_subjects && tutor.tutor_subjects.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {tutor.tutor_subjects.slice(0, 3).map((ts, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">{ts.subjects?.name_en}</Badge>
                ))}
                {tutor.tutor_subjects.length > 3 && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">+{tutor.tutor_subjects.length - 3}</Badge>
                )}
              </div>
            )}

            {/* Teaching mode & class levels */}
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 bg-muted/60 rounded-md px-2 py-1">
                <ModeIcon className="h-3 w-3" />{modeInfo.label}
              </span>
              {tutor.class_levels && tutor.class_levels.length > 0 && (
                <span className="flex items-center gap-1 bg-muted/60 rounded-md px-2 py-1">
                  <GraduationCap className="h-3 w-3" />
                  {tutor.class_levels.slice(0, 2).join(', ')}
                  {tutor.class_levels.length > 2 && `+${tutor.class_levels.length - 2}`}
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />{tutor.experience_years || 0}y
                </span>
                {(tutor.total_students || 0) > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />{tutor.total_students}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="font-bold text-primary text-sm">৳{tutor.monthly_salary_min || 500}-{tutor.monthly_salary_max || 1500}</span>
                <span className="text-[10px] text-muted-foreground">/mo</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View Profile <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="gradient-hero text-primary-foreground py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Find Your Perfect Tutor</h1>
          <p className="text-sm opacity-90 max-w-xl">Browse verified tutors and find the right match for your learning needs</p>

          {/* Inline search */}
          <div className="mt-6 bg-card/10 backdrop-blur-sm rounded-xl p-3 flex flex-col sm:flex-row gap-3 max-w-3xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
              <Input
                placeholder="Search by name, subject, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-lg bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-white/40"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedSubject} onValueChange={v => setSelectedSubject(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px] h-10 rounded-lg bg-white/10 border-white/20 text-primary-foreground">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjectOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="h-10 rounded-lg bg-white text-primary hover:bg-white/90 font-semibold px-5" onClick={fetchTutors}>
                <Search className="h-4 w-4 mr-1.5" />Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Toolbar: Filters toggle, sort, view mode, count */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-lg"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-[20px] p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive text-xs h-8">
                <X className="h-3 w-3 mr-1" />Clear all
              </Button>
            )}
            <p className="text-sm text-muted-foreground ml-2">
              <span className="font-semibold text-foreground">{totalCount}</span> tutors found
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="experience">Most Experienced</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode('list')}>
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6 border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Category */}
                <div>
                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">Category</Label>
                  <Select value={selectedCategory} onValueChange={v => setSelectedCategory(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {JOB_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Background */}
                <div>
                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">Background</Label>
                  <Select value={selectedBackground} onValueChange={v => setSelectedBackground(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Backgrounds</SelectItem>
                      {STUDENT_BACKGROUNDS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div>
                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">Tutor Gender</Label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Division */}
                <div>
                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">Division</Label>
                  <Select value={selectedDivision} onValueChange={v => { setSelectedDivision(v === 'all' ? '' : v); setSelectedDistrict(''); setSelectedArea(''); }}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map(d => <SelectItem key={d.en} value={d.en}>{d.en}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* City (Thana/Upazila) */}
                <div>
                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">City</Label>
                  <Select value={selectedArea || 'all'} onValueChange={v => setSelectedArea(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-1">
                        <Input placeholder="Search..." value={areaSearch} onChange={e => setAreaSearch(e.target.value)} className="h-7 text-xs" onClick={e => e.stopPropagation()} />
                      </div>
                      <SelectItem value="all">All Cities</SelectItem>
                      {areas
                        .filter(a => !areaSearch || a.name_en.toLowerCase().includes(areaSearch.toLowerCase()) || (a.district_name || '').toLowerCase().includes(areaSearch.toLowerCase()))
                        .map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name_en}{a.district_name ? ` (${a.district_name})` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                {/* Salary range */}
                <div className="w-full sm:w-64">
                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Salary: ৳{priceRange[0].toLocaleString()} – ৳{priceRange[1].toLocaleString()}/mo
                  </Label>
                  <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={10000} step={500} className="mt-2" />
                </div>

                {/* Verified */}
                <div className="flex items-center gap-2 h-9">
                  <Checkbox id="verified-only" checked={verifiedOnly} onCheckedChange={c => setVerifiedOnly(c === true)} />
                  <Label htmlFor="verified-only" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />Verified Only
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className={viewMode === 'list' ? 'p-4 flex gap-4 items-center' : 'p-5'}>
                  <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paginatedTutors.length > 0 ? (
          <>
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
              {paginatedTutors.map(tutor => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-lg">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-9 h-9 rounded-lg text-xs">
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-lg">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-1">No tutors found</h3>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search criteria</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
