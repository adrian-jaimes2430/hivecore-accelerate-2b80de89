ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS impulsador_deleted_id uuid,
  ADD COLUMN IF NOT EXISTS impulsador_deleted_name text,
  ADD COLUMN IF NOT EXISTS impulsador_deleted_email text,
  ADD COLUMN IF NOT EXISTS impulsador_deleted_phone text;

COMMENT ON COLUMN public.orders.impulsador_deleted_id IS 'Historical user id retained when an impulsador account is permanently deleted.';
COMMENT ON COLUMN public.orders.impulsador_deleted_name IS 'Historical impulsador display name retained after account deletion.';
COMMENT ON COLUMN public.orders.impulsador_deleted_email IS 'Historical impulsador email retained after account deletion.';
COMMENT ON COLUMN public.orders.impulsador_deleted_phone IS 'Historical impulsador phone retained after account deletion.';