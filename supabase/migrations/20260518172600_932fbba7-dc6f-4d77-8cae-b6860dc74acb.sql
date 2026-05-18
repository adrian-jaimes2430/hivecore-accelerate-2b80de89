DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;

CREATE POLICY "Public read product image files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-images'
  AND name LIKE 'products/%'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'avif')
);