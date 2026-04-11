
-- Ensure no duplicate phone numbers across users
CREATE UNIQUE INDEX idx_profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;

-- Ensure no duplicate emails across users  
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
