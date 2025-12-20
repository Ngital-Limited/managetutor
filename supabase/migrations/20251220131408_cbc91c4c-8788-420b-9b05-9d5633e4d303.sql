-- Create favorites/shortlist table for parents
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, tutor_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Parents can view own favorites" 
ON public.favorites FOR SELECT 
USING (auth.uid() = parent_id);

CREATE POLICY "Parents can add favorites" 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can remove favorites" 
ON public.favorites FOR DELETE 
USING (auth.uid() = parent_id);

-- Add is_featured column to tutor_profiles for premium tutors
ALTER TABLE public.tutor_profiles 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for faster search queries
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_featured ON public.tutor_profiles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_rating ON public.tutor_profiles(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_available ON public.tutor_profiles(is_available) WHERE is_available = true;