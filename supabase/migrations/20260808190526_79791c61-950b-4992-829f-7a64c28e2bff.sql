ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meta_pixel_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS meta_test_event_code text;