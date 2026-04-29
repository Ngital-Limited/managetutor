
-- Ad placements table
CREATE TABLE public.ad_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('image','gif','html')),
  image_url TEXT,
  link_url TEXT,
  html_content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  width INT NOT NULL DEFAULT 300,
  height INT NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads"
ON public.ad_placements FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all ads"
ON public.ad_placements FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ads"
ON public.ad_placements FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ads"
ON public.ad_placements FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ads"
ON public.ad_placements FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ad_placements_updated_at
BEFORE UPDATE ON public.ad_placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ad_placements_slot_active ON public.ad_placements(slot, is_active);

-- Public storage bucket for ad creatives
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view ad files"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads');

CREATE POLICY "Admins can upload ad files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ad files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ad files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ads' AND public.has_role(auth.uid(), 'admin'));
