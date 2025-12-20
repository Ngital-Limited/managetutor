
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('parent', 'tutor', 'agency', 'admin');

-- Create teaching_mode enum
CREATE TYPE public.teaching_mode AS ENUM ('online', 'in_person', 'hybrid');

-- Create verification_status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create job_status enum
CREATE TYPE public.job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Create application_status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- Create gender enum
CREATE TYPE public.gender AS ENUM ('male', 'female', 'any');

-- Districts table for Bangladesh locations
CREATE TABLE public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  division_en TEXT NOT NULL,
  division_bn TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Areas/neighborhoods within districts
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE NOT NULL,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  full_name_bn TEXT,
  phone TEXT,
  avatar_url TEXT,
  district_id UUID REFERENCES public.districts(id),
  area_id UUID REFERENCES public.areas(id),
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'bn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  category_en TEXT,
  category_bn TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tutor profiles (extended profile for tutors)
CREATE TABLE public.tutor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio TEXT,
  bio_bn TEXT,
  education TEXT,
  education_bn TEXT,
  experience_years INTEGER DEFAULT 0,
  hourly_rate_min INTEGER,
  hourly_rate_max INTEGER,
  teaching_mode teaching_mode DEFAULT 'in_person',
  gender gender NOT NULL,
  is_available BOOLEAN DEFAULT true,
  verification_status verification_status DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  total_students INTEGER DEFAULT 0,
  average_rating NUMERIC(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tutor subjects (many-to-many)
CREATE TABLE public.tutor_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id UUID REFERENCES public.tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (tutor_profile_id, subject_id)
);

-- Agency profiles
CREATE TABLE public.agency_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agency_name TEXT NOT NULL,
  agency_name_bn TEXT,
  description TEXT,
  description_bn TEXT,
  website TEXT,
  logo_url TEXT,
  verification_status verification_status DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  total_tutors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agency tutors (tutors managed by agencies)
CREATE TABLE public.agency_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agency_profiles(id) ON DELETE CASCADE NOT NULL,
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (agency_id, tutor_id)
);

-- Tuition jobs posted by parents
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT NOT NULL,
  description_bn TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  district_id UUID REFERENCES public.districts(id) NOT NULL,
  area_id UUID REFERENCES public.areas(id),
  student_gender gender,
  preferred_tutor_gender gender DEFAULT 'any',
  class_level TEXT,
  days_per_week INTEGER,
  duration_hours NUMERIC(3,1),
  budget_min INTEGER,
  budget_max INTEGER,
  teaching_mode teaching_mode DEFAULT 'in_person',
  status job_status DEFAULT 'open',
  is_featured BOOLEAN DEFAULT false,
  total_applications INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Job applications from tutors
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  cover_message TEXT,
  proposed_rate INTEGER,
  status application_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (job_id, tutor_id)
);

-- Messages between users
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reviews from parents to tutors
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (parent_id, tutor_id, job_id)
);

-- Verification documents for tutors
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status verification_status DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies

-- Districts: Public read access
CREATE POLICY "Districts are viewable by everyone" ON public.districts FOR SELECT USING (true);

-- Areas: Public read access  
CREATE POLICY "Areas are viewable by everyone" ON public.areas FOR SELECT USING (true);

-- Subjects: Public read access
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects FOR SELECT USING (true);

-- Profiles: Users can view all profiles, update own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles: Users can view own roles, admins can manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role during signup" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tutor profiles: Public read for approved, tutors can manage own
CREATE POLICY "Approved tutor profiles are viewable" ON public.tutor_profiles FOR SELECT USING (true);
CREATE POLICY "Tutors can insert own profile" ON public.tutor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tutors can update own profile" ON public.tutor_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Tutor subjects: Public read, tutors can manage own
CREATE POLICY "Tutor subjects are viewable by everyone" ON public.tutor_subjects FOR SELECT USING (true);
CREATE POLICY "Tutors can manage own subjects" ON public.tutor_subjects FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_profile_id AND user_id = auth.uid()));
CREATE POLICY "Tutors can delete own subjects" ON public.tutor_subjects FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_profile_id AND user_id = auth.uid()));

-- Agency profiles: Public read for approved, agencies can manage own
CREATE POLICY "Agency profiles are viewable" ON public.agency_profiles FOR SELECT USING (true);
CREATE POLICY "Agencies can insert own profile" ON public.agency_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Agencies can update own profile" ON public.agency_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Agency tutors: Agencies can manage their tutors
CREATE POLICY "Agency tutors are viewable" ON public.agency_tutors FOR SELECT USING (true);
CREATE POLICY "Agencies can add tutors" ON public.agency_tutors FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_profiles WHERE id = agency_id AND user_id = auth.uid()));

-- Jobs: Public read for open jobs, parents can manage own
CREATE POLICY "Open jobs are viewable by everyone" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Parents can insert jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Parents can delete own jobs" ON public.jobs FOR DELETE USING (auth.uid() = parent_id);

-- Applications: Tutors can apply, parents can view applications to their jobs
CREATE POLICY "Users can view relevant applications" ON public.applications FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND parent_id = auth.uid())
  );
CREATE POLICY "Tutors can insert applications" ON public.applications FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_id AND user_id = auth.uid()));
CREATE POLICY "Tutors can update own applications" ON public.applications FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_id AND user_id = auth.uid()));

-- Messages: Users can view/send own messages
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Reviews: Public read, parents can write
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Parents can write reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Verification documents: Tutors can upload, admins can review
CREATE POLICY "Tutors can view own documents" ON public.verification_documents FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_id AND user_id = auth.uid()));
CREATE POLICY "Tutors can upload documents" ON public.verification_documents FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.tutor_profiles WHERE id = tutor_id AND user_id = auth.uid()));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tutor_profiles_updated_at BEFORE UPDATE ON public.tutor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_profiles_updated_at BEFORE UPDATE ON public.agency_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update tutor average rating
CREATE OR REPLACE FUNCTION public.update_tutor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.tutor_profiles
  SET 
    average_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE tutor_id = NEW.tutor_id AND is_approved = true),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE tutor_id = NEW.tutor_id AND is_approved = true)
  WHERE id = NEW.tutor_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_tutor_rating();

-- Trigger to update job application count
CREATE OR REPLACE FUNCTION public.update_job_application_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs SET total_applications = total_applications + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jobs SET total_applications = total_applications - 1 WHERE id = OLD.job_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_application_change
  AFTER INSERT OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_job_application_count();
