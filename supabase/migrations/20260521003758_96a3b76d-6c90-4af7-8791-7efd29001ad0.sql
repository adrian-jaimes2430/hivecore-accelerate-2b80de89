
-- Add SKU column to products with auto-generated unique value
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;

CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'AYO-' || upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sku_trigger ON public.products;
CREATE TRIGGER products_sku_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_sku();

-- Backfill existing rows
UPDATE public.products
SET sku = 'AYO-' || upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8))
WHERE sku IS NULL OR sku = '';

ALTER TABLE public.products ALTER COLUMN sku SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key ON public.products(sku);

-- Allow admins/collaborators to delete orders
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'super_admin'::app_role) OR app_private.has_role(auth.uid(), 'collaborator'::app_role));
