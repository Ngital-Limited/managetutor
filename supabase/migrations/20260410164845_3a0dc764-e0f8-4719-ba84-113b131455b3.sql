
-- Admin can view all user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all applications
CREATE POLICY "Admins can view all applications"
ON public.applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any application
CREATE POLICY "Admins can update applications"
ON public.applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update platform settings
CREATE POLICY "Admins can update settings"
ON public.platform_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert platform settings
CREATE POLICY "Admins can insert settings"
ON public.platform_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can view all payment transactions
CREATE POLICY "Admins can view all transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any job
CREATE POLICY "Admins can update jobs"
ON public.jobs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any job
CREATE POLICY "Admins can delete jobs"
ON public.jobs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view/manage subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all reviews (including unapproved)
CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update reviews (approve/reject)
CREATE POLICY "Admins can update reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
