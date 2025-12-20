
-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', false);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for verification documents (private - only owner and admins)
CREATE POLICY "Users can upload own verification docs" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own verification docs" ON storage.objects FOR SELECT 
USING (bucket_id = 'verification-documents' AND (
  auth.uid()::text = (storage.foldername(name))[1] 
  OR public.has_role(auth.uid(), 'admin')
));

-- Storage policies for avatars (public read, owner write)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add admin policies for verification documents management
CREATE POLICY "Admins can view all verification docs" ON public.verification_documents FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verification docs" ON public.verification_documents FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to update tutor profiles
CREATE POLICY "Admins can update tutor profiles" ON public.tutor_profiles FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for reports
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add phone_verified and email_verified to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
