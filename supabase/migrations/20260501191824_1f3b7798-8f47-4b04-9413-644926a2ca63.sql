
-- Active Tuitions / Sessions
CREATE TABLE public.tuition_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  job_id UUID,
  application_id UUID,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_level TEXT,
  session_day TEXT,
  session_time TEXT,
  monthly_fee INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tuition_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors can view own sessions" ON public.tuition_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tutors can create own sessions" ON public.tuition_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tutors can update own sessions" ON public.tuition_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Tutors can delete own sessions" ON public.tuition_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage tuition sessions" ON public.tuition_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tuition_sessions_updated_at BEFORE UPDATE ON public.tuition_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Session Logs (attendance, topics, homework)
CREATE TABLE public.session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.tuition_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance TEXT NOT NULL DEFAULT 'present',
  topic_covered TEXT,
  homework_given TEXT,
  tutor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session logs" ON public.session_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own session logs" ON public.session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session logs" ON public.session_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own session logs" ON public.session_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage session logs" ON public.session_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Referral Codes
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_earnings INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own referral code" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage referral codes" ON public.referral_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Referral History
CREATE TABLE public.referral_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral history" ON public.referral_history FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can manage referral history" ON public.referral_history FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tutor Badges (gamification)
CREATE TABLE public.tutor_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

ALTER TABLE public.tutor_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" ON public.tutor_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage badges" ON public.tutor_badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
