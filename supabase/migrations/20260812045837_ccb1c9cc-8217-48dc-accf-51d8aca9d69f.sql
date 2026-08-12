ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_city text,
  ADD COLUMN IF NOT EXISTS client_region text,
  ADD COLUMN IF NOT EXISTS client_email text;