
-- Admin can INSERT jobs
CREATE POLICY "Admins can insert jobs"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can INSERT and DELETE applications
CREATE POLICY "Admins can insert applications"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications"
ON public.applications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on profiles
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT and DELETE on tutor_profiles (update already exists)
CREATE POLICY "Admins can insert tutor profiles"
ON public.tutor_profiles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tutor profiles"
ON public.tutor_profiles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on tutor_subjects
CREATE POLICY "Admins can manage tutor subjects"
ON public.tutor_subjects FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on tutor_education
CREATE POLICY "Admins can manage tutor education"
ON public.tutor_education FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on tutor_job_experiences
CREATE POLICY "Admins can manage tutor experiences"
ON public.tutor_job_experiences FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can create and delete demo bookings
CREATE POLICY "Admins can insert demo bookings"
ON public.demo_bookings FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete demo bookings"
ON public.demo_bookings FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on favorites
CREATE POLICY "Admins can manage favorites"
ON public.favorites FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete reviews
CREATE POLICY "Admins can delete reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on user_roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on messages
CREATE POLICY "Admins can manage messages"
ON public.messages FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on agency_profiles
CREATE POLICY "Admins can manage agency profiles"
ON public.agency_profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on agency_tutors
CREATE POLICY "Admins can manage agency tutors"
ON public.agency_tutors FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin full access on blocked_users
CREATE POLICY "Admins can manage blocked users"
ON public.blocked_users FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage featured listings
CREATE POLICY "Admins can manage featured listings"
ON public.featured_listings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage payment transactions
CREATE POLICY "Admins can manage payment transactions"
ON public.payment_transactions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage verification documents
CREATE POLICY "Admins can manage verification documents"
ON public.verification_documents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage user subscriptions
CREATE POLICY "Admins can manage user subscriptions"
ON public.user_subscriptions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete refund requests
CREATE POLICY "Admins can delete refund requests"
ON public.refund_requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete reports
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete platform settings
CREATE POLICY "Admins can delete settings"
ON public.platform_settings FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage support tickets fully
CREATE POLICY "Admins can insert tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tickets"
ON public.support_tickets FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage payout requests fully
CREATE POLICY "Admins can insert payout requests"
ON public.payout_requests FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payout requests"
ON public.payout_requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage review update requests fully
CREATE POLICY "Admins can insert review update requests"
ON public.review_update_requests FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete review update requests"
ON public.review_update_requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can manage demo profiles
CREATE POLICY "Admins can manage demo profiles"
ON public.demo_profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
