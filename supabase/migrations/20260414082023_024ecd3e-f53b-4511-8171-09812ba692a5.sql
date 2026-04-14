
-- Allow admins to manage subjects
CREATE POLICY "Admins can insert subjects"
  ON public.subjects FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subjects"
  ON public.subjects FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subjects"
  ON public.subjects FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage districts
CREATE POLICY "Admins can insert districts"
  ON public.districts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update districts"
  ON public.districts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete districts"
  ON public.districts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage areas
CREATE POLICY "Admins can insert areas"
  ON public.areas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update areas"
  ON public.areas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete areas"
  ON public.areas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
