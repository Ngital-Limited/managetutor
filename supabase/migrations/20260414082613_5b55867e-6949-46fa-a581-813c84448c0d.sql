
-- Drop existing FKs pointing to auth.users
ALTER TABLE public.reports DROP CONSTRAINT reports_reporter_id_fkey;
ALTER TABLE public.reports DROP CONSTRAINT reports_reported_user_id_fkey;
ALTER TABLE public.reports DROP CONSTRAINT reports_reviewed_by_fkey;
ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT messages_receiver_id_fkey;
ALTER TABLE public.blocked_users DROP CONSTRAINT blocked_users_blocker_id_fkey;
ALTER TABLE public.blocked_users DROP CONSTRAINT blocked_users_blocked_id_fkey;
ALTER TABLE public.favorites DROP CONSTRAINT favorites_parent_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
ALTER TABLE public.agency_profiles DROP CONSTRAINT agency_profiles_user_id_fkey;

-- Add FKs to profiles
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_parent_id_profiles_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_parent_id_profiles_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tutor_profiles
  ADD CONSTRAINT tutor_profiles_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_profiles_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reported_user_id_profiles_fkey FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_parent_id_profiles_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_profiles_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_receiver_id_profiles_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.demo_bookings
  ADD CONSTRAINT demo_bookings_parent_id_profiles_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.blocked_users
  ADD CONSTRAINT blocked_users_blocker_id_profiles_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.blocked_users
  ADD CONSTRAINT blocked_users_blocked_id_profiles_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payout_requests
  ADD CONSTRAINT payout_requests_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.admin_permissions
  ADD CONSTRAINT admin_permissions_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.agency_profiles
  ADD CONSTRAINT agency_profiles_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
