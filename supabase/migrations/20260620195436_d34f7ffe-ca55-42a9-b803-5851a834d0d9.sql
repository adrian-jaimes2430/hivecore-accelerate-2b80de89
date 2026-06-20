
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS luxury_product_id uuid REFERENCES public.luxury_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_luxury_product_id_idx ON public.orders(luxury_product_id);

-- Backfill any existing rows with no SKU
UPDATE public.luxury_products
SET sku = 'LUX-' || upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8))
WHERE sku IS NULL OR sku = '';

CREATE UNIQUE INDEX IF NOT EXISTS luxury_products_sku_key ON public.luxury_products(sku);

CREATE OR REPLACE FUNCTION public.generate_luxury_sku()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'LUX-' || upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS luxury_products_sku_trigger ON public.luxury_products;
CREATE TRIGGER luxury_products_sku_trigger
BEFORE INSERT ON public.luxury_products
FOR EACH ROW EXECUTE FUNCTION public.generate_luxury_sku();
