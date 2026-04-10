
-- Admin can view ALL plans (including inactive ones)
CREATE POLICY "Admins can view all plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can create plans
CREATE POLICY "Admins can insert plans"
ON public.subscription_plans FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can update plans
CREATE POLICY "Admins can update plans"
ON public.subscription_plans FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete plans
CREATE POLICY "Admins can delete plans"
ON public.subscription_plans FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
