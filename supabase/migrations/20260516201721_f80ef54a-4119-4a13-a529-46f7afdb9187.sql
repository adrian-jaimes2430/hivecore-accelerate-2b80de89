
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('super_admin', 'collaborator', 'impulsador');
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'blocked');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status public.user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

-- ===== CATEGORIES =====
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'green',
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  upsell_price NUMERIC(12,2),
  short_description TEXT,
  description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  funnel_sections JSONB DEFAULT '[]'::jsonb,
  cta_label TEXT DEFAULT 'Pedir ahora',
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code TEXT NOT NULL UNIQUE DEFAULT ('HC-' || upper(substring(gen_random_uuid()::text, 1, 8))),
  impulsador_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID REFERENCES public.products ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_address TEXT,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  total NUMERIC(12,2),
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ===== TRIGGERS =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'impulsador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== RLS POLICIES =====
-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- user_roles
CREATE POLICY "Users see own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- categories: approved users can read; admins/collaborators write
CREATE POLICY "Approved users read categories" ON public.categories
FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins write categories" ON public.categories
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));

-- products
CREATE POLICY "Approved users read products" ON public.products
FOR SELECT TO authenticated USING (public.is_approved(auth.uid()) AND is_active = TRUE);
CREATE POLICY "Admins manage products" ON public.products
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));

-- orders
CREATE POLICY "Impulsadores see own orders" ON public.orders
FOR SELECT TO authenticated USING (auth.uid() = impulsador_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));
CREATE POLICY "Approved users create orders" ON public.orders
FOR INSERT TO authenticated WITH CHECK (auth.uid() = impulsador_id AND public.is_approved(auth.uid()));
CREATE POLICY "Admins update orders" ON public.orders
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));

-- ===== SEED DATA =====
INSERT INTO public.categories (slug, name, description, color, sort_order) VALUES
  ('aguaje', 'Aguaje', 'Suplementos naturales premium', 'orange', 1),
  ('nomadhive', 'NomadHive', 'Productos de bienestar y energía', 'green', 2),
  ('anma', 'ANMA', 'Línea premium de cuidado personal', 'orange', 3),
  ('ao-essentials', 'A&O Essentials', 'Esenciales del ecosistema A&O', 'red', 4);

INSERT INTO public.products (slug, name, category_id, price, upsell_price, short_description, description, benefits, images, is_featured, is_trending, is_new, is_bestseller, is_recommended) VALUES
  ('aguaje-premium', 'Aguaje Premium', (SELECT id FROM public.categories WHERE slug='aguaje'),
   149.00, 249.00,
   'El secreto natural para realzar tu silueta',
   'Aguaje Premium es un suplemento 100% natural extraído del fruto del aguaje amazónico, conocido por sus fitoestrógenos naturales que ayudan a realzar curvas, mejorar la piel y equilibrar las hormonas.',
   '["Realza tu silueta de forma natural","Mejora la elasticidad de la piel","Equilibrio hormonal","100% natural amazónico","Resultados visibles en 30 días"]'::jsonb,
   '[]'::jsonb,
   true, true, false, true, true),
  ('nomadhive-energy', 'NomadHive Energy', (SELECT id FROM public.categories WHERE slug='nomadhive'),
   89.00, 149.00,
   'Energía limpia para mentes inquietas',
   'Una mezcla premium de adaptógenos, miel orgánica y nootropicos diseñada para impulsar tu rendimiento sin caídas de energía.',
   '["Energía sostenida 8+ horas","Sin azúcar refinada","Mejora el enfoque mental","Adaptógenos premium"]'::jsonb,
   '[]'::jsonb,
   true, true, true, false, true),
  ('anma-glow-serum', 'ANMA Glow Serum', (SELECT id FROM public.categories WHERE slug='anma'),
   199.00, 299.00,
   'El glow que tu piel estaba esperando',
   'Serum facial con vitamina C estabilizada, ácido hialurónico y péptidos. Resultados visibles en 14 días.',
   '["Glow inmediato","Reduce manchas","Hidratación profunda","Anti-edad efectivo"]'::jsonb,
   '[]'::jsonb,
   true, false, true, true, true),
  ('ao-starter-kit', 'A&O Starter Kit', (SELECT id FROM public.categories WHERE slug='ao-essentials'),
   299.00, NULL,
   'El kit completo para nuevos impulsadores',
   'Todo lo que necesitas para arrancar: muestras, material de venta y guía estratégica del ecosistema A&O.',
   '["Material de venta incluido","Muestras de productos top","Guía estratégica","Acceso a comunidad VIP"]'::jsonb,
   '[]'::jsonb,
   false, false, true, false, true);
