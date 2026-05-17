
-- Create public bucket for product & funnel images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admin write
DROP POLICY IF EXISTS "Admins upload product-images" ON storage.objects;
CREATE POLICY "Admins upload product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND (
    app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR app_private.has_role(auth.uid(), 'collaborator'::app_role)
  )
);

DROP POLICY IF EXISTS "Admins update product-images" ON storage.objects;
CREATE POLICY "Admins update product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND (
    app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR app_private.has_role(auth.uid(), 'collaborator'::app_role)
  )
);

DROP POLICY IF EXISTS "Admins delete product-images" ON storage.objects;
CREATE POLICY "Admins delete product-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND (
    app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR app_private.has_role(auth.uid(), 'collaborator'::app_role)
  )
);
