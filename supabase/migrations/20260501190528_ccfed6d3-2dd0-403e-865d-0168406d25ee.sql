
-- Profile views tracking
CREATE TABLE public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id uuid NOT NULL,
  viewer_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_views_tutor ON public.profile_views (tutor_id);
CREATE INDEX idx_profile_views_date ON public.profile_views (tutor_id, viewed_at);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a profile view"
  ON public.profile_views FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Tutors can view own profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tutor_profiles tp
      WHERE tp.id = profile_views.tutor_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Saved jobs for tutors
CREATE TABLE public.saved_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved jobs"
  ON public.saved_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON public.saved_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
  ON public.saved_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage saved jobs"
  ON public.saved_jobs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tutor settings (notification & privacy prefs)
CREATE TABLE public.tutor_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_new_jobs boolean NOT NULL DEFAULT true,
  email_application_updates boolean NOT NULL DEFAULT true,
  email_promotions boolean NOT NULL DEFAULT false,
  push_notifications boolean NOT NULL DEFAULT true,
  hide_last_name boolean NOT NULL DEFAULT false,
  profile_visibility text NOT NULL DEFAULT 'public',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.tutor_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.tutor_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.tutor_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all settings"
  ON public.tutor_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
