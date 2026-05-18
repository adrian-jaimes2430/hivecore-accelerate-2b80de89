CREATE POLICY "Public can view active product funnels"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);