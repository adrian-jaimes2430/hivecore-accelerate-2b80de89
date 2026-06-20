
CREATE TABLE public.luxury_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.luxury_brands TO authenticated;
GRANT ALL ON public.luxury_brands TO service_role;
ALTER TABLE public.luxury_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view active brands" ON public.luxury_brands
  FOR SELECT TO authenticated
  USING (is_active = true AND public.is_approved(auth.uid()));
CREATE POLICY "Admins manage brands" ON public.luxury_brands
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER touch_luxury_brands BEFORE UPDATE ON public.luxury_brands
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.luxury_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.luxury_categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.luxury_categories TO authenticated;
GRANT ALL ON public.luxury_categories TO service_role;
ALTER TABLE public.luxury_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view active categories" ON public.luxury_categories
  FOR SELECT TO authenticated
  USING (is_active = true AND public.is_approved(auth.uid()));
CREATE POLICY "Admins manage luxury categories" ON public.luxury_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER touch_luxury_categories BEFORE UPDATE ON public.luxury_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.luxury_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_id UUID REFERENCES public.luxury_categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.luxury_brands(id) ON DELETE SET NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  suggested_retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  stock_quantity INT NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.luxury_products TO authenticated;
GRANT ALL ON public.luxury_products TO service_role;
ALTER TABLE public.luxury_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users view active luxury products" ON public.luxury_products
  FOR SELECT TO authenticated
  USING (is_active = true AND public.is_approved(auth.uid()));
CREATE POLICY "Admins manage luxury products" ON public.luxury_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER touch_luxury_products BEFORE UPDATE ON public.luxury_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_luxury_products_category ON public.luxury_products(category_id);
CREATE INDEX idx_luxury_products_brand ON public.luxury_products(brand_id);
CREATE INDEX idx_luxury_products_active ON public.luxury_products(is_active);

INSERT INTO public.luxury_categories (name, slug, sort_order) VALUES
  ('Perfumería Premium', 'perfumeria-premium', 1),
  ('Relojería Premium', 'relojeria-premium', 2),
  ('Joyería AAA', 'joyeria-aaa', 3),
  ('Marroquinería', 'marroquineria', 4);

INSERT INTO public.luxury_categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, m.id, v.ord FROM (VALUES
  ('Calzado','calzado',1),
  ('Morrales','morrales',2),
  ('Billeteras','billeteras',3),
  ('Correas','correas',4),
  ('Accesorios','accesorios',5)
) AS v(name,slug,ord), public.luxury_categories m
WHERE m.slug = 'marroquineria';
