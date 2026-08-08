ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bundle_pricing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_2 numeric,
  ADD COLUMN IF NOT EXISTS price_3 numeric;