
ALTER TABLE public.luxury_products
  ADD COLUMN IF NOT EXISTS videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_impulsador_price boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.luxury_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  media_url text NOT NULL,
  link_url text,
  cta_label text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.luxury_promos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.luxury_promos TO authenticated;
GRANT ALL ON public.luxury_promos TO service_role;

ALTER TABLE public.luxury_promos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promos public read active"
  ON public.luxury_promos FOR SELECT
  USING (is_active = true);

CREATE POLICY "promos admin manage"
  ON public.luxury_promos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

DROP TRIGGER IF EXISTS luxury_promos_touch_updated_at ON public.luxury_promos;
CREATE TRIGGER luxury_promos_touch_updated_at
  BEFORE UPDATE ON public.luxury_promos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
