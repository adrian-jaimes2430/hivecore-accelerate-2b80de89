CREATE TYPE public.impulsor_level AS ENUM ('junior','senior','lider','staff_matriz');

ALTER TABLE public.profiles
  ADD COLUMN level public.impulsor_level NOT NULL DEFAULT 'junior',
  ADD COLUMN level_updated_at timestamptz,
  ADD COLUMN level_updated_by uuid;

-- Only super admins may change the level column; everyone else keeps their current level.
CREATE OR REPLACE FUNCTION public.profiles_guard_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level IS DISTINCT FROM OLD.level THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      NEW.level := OLD.level;
      NEW.level_updated_at := OLD.level_updated_at;
      NEW.level_updated_by := OLD.level_updated_by;
    ELSE
      NEW.level_updated_at := now();
      NEW.level_updated_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_level ON public.profiles;
CREATE TRIGGER profiles_guard_level
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_level();

REVOKE EXECUTE ON FUNCTION public.profiles_guard_level() FROM PUBLIC, anon, authenticated;