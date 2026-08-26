-- ============================================================
-- HiveCore / AnMa Luxury — esquema completo
-- Generado: 2026-08-26 00:36 UTC
-- Ejecutar en el SQL Editor del proyecto Supabase destino.
-- Orden = orden historico de migraciones (29 archivos).
-- ============================================================

-- ------------------------------------------------------------
-- 20260516201721_f80ef54a-4119-4a13-a529-46f7afdb9187.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 20260516201742_bb91b906-cb49-4027-9f32-cc1d6b9ffda6.sql
-- ------------------------------------------------------------

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 20260516203619_7a35453a-6934-46d6-9ec1-33486c160f60.sql
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 20260516203650_eb22c31e-eea1-4e18-af56-0399e18806a0.sql
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION app_private.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'approved'
  )
$$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_approved(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins write categories" ON public.categories;
DROP POLICY IF EXISTS "Approved users read categories" ON public.categories;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Approved users create orders" ON public.orders;
DROP POLICY IF EXISTS "Impulsadores see own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;
DROP POLICY IF EXISTS "Approved users read products" ON public.products;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;

CREATE POLICY "Admins write categories"
ON public.categories
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role));

CREATE POLICY "Approved users read categories"
ON public.categories
FOR SELECT
TO authenticated
USING (app_private.is_approved(auth.uid()));

CREATE POLICY "Admins update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role));

CREATE POLICY "Approved users create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = impulsador_id) AND app_private.is_approved(auth.uid()));

CREATE POLICY "Impulsadores see own orders"
ON public.orders
FOR SELECT
TO authenticated
USING ((auth.uid() = impulsador_id) OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role));

CREATE POLICY "Admins manage products"
ON public.products
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role));

CREATE POLICY "Approved users read products"
ON public.products
FOR SELECT
TO authenticated
USING (app_private.is_approved(auth.uid()) AND (is_active = true));

CREATE POLICY "Admins update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Users see own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM authenticated, anon, public;

-- ------------------------------------------------------------
-- 20260517210332_4cf8af93-bb01-4b8d-96da-39330fdb6bb5.sql
-- ------------------------------------------------------------

-- Create public bucket for product & funnel images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admin write
DROP POLICY IF EXISTS "Admins upload product-images" ON storage.objects;
CREATE POLICY "Admins upload product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND (
    app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR app_private.has_role(auth.uid(), 'collaborator'::app_role)
  )
);

DROP POLICY IF EXISTS "Admins update product-images" ON storage.objects;
CREATE POLICY "Admins update product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND (
    app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR app_private.has_role(auth.uid(), 'collaborator'::app_role)
  )
);

DROP POLICY IF EXISTS "Admins delete product-images" ON storage.objects;
CREATE POLICY "Admins delete product-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND (
    app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR app_private.has_role(auth.uid(), 'collaborator'::app_role)
  )
);


-- ------------------------------------------------------------
-- 20260518172516_b75bc407-42d7-4053-9a65-083d5c7224fe.sql
-- ------------------------------------------------------------
CREATE POLICY "Public can view active product funnels"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- ------------------------------------------------------------
-- 20260518172600_932fbba7-dc6f-4d77-8cae-b6860dc74acb.sql
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;

CREATE POLICY "Public read product image files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-images'
  AND name LIKE 'products/%'
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'avif')
);

-- ------------------------------------------------------------
-- 20260521003758_96a3b76d-6c90-4af7-8791-7efd29001ad0.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 20260521004840_email_infra.sql
-- ------------------------------------------------------------
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


-- ------------------------------------------------------------
-- 20260604002538_0a421374-2e75-4146-bbf1-0e85157c6c3e.sql
-- ------------------------------------------------------------
-- Lock down SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
-- and set fixed search_path on email queue helpers.

-- Email queue helpers: service_role only
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- Trigger-only functions: nobody needs direct EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_product_sku() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role / is_approved are used inside RLS policies and must remain callable
-- by authenticated. Keep their grants intact, just ensure search_path is set
-- (already set in the function bodies).

-- ------------------------------------------------------------
-- 20260604002830_0d990863-770e-4e4b-8298-e46d7589c3d8.sql
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active product funnels" ON public.products;

-- ------------------------------------------------------------
-- 20260605015229_0ba04a96-801b-4db2-b218-fc09d7ef252b.sql
-- ------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS secondary_category_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- 20260620192145_24df0d6f-377c-49e8-8c0f-2ded42550977.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 20260620195436_d34f7ffe-ca55-42a9-b803-5851a834d0d9.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 20260620201750_b7d91c84-a0e5-44b9-b323-73d06f883a52.sql
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, anon, service_role;

-- ------------------------------------------------------------
-- 20260621001050_8dcd792a-104b-40cf-8c39-c350baab0347.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 20260709191203_e31fc5f7-346f-4fe5-a355-4d0cb5a594ae.sql
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  orders_sent INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage integrations"
  ON public.integrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS external_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_ref TEXT,
  ADD COLUMN IF NOT EXISTS external_error TEXT;


-- ------------------------------------------------------------
-- 20260711213344_c6dd7a2c-c0fd-40e6-aef7-d85435dfdc00.sql
-- ------------------------------------------------------------

-- Revoke EXECUTE from PUBLIC/anon/authenticated on internal SECURITY DEFINER functions.
-- Keep has_role and is_approved executable (used by RLS policies from authenticated users).

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_product_sku() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_luxury_sku() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- has_role and is_approved remain executable by authenticated (required by RLS policies).
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, service_role;


-- ------------------------------------------------------------
-- 20260802200502_9c3454b7-4e5e-480e-a3bf-12e567fe5bce.sql
-- ------------------------------------------------------------
ALTER TABLE public.orders ALTER COLUMN impulsador_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'impulsador',
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_key ON public.orders (payment_reference);

CREATE OR REPLACE FUNCTION public.orders_validate_meta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source NOT IN ('impulsador','paid_traffic') THEN
    RAISE EXCEPTION 'invalid source: %', NEW.source;
  END IF;
  IF NEW.payment_method NOT IN ('cod','online') THEN
    RAISE EXCEPTION 'invalid payment_method: %', NEW.payment_method;
  END IF;
  IF NEW.payment_status NOT IN ('pending','paid','failed','voided') THEN
    RAISE EXCEPTION 'invalid payment_status: %', NEW.payment_status;
  END IF;
  IF NEW.source = 'impulsador' AND NEW.impulsador_id IS NULL THEN
    RAISE EXCEPTION 'impulsador orders require impulsador_id';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.orders_validate_meta() FROM PUBLIC;

DROP TRIGGER IF EXISTS orders_validate_meta_trg ON public.orders;
CREATE TRIGGER orders_validate_meta_trg
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_validate_meta();

-- ------------------------------------------------------------
-- 20260808004009_adcdfef6-9958-48e7-a05e-9430c73b7cf0.sql
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS bundle_pricing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_2 numeric,
  ADD COLUMN IF NOT EXISTS price_3 numeric;

-- ------------------------------------------------------------
-- 20260808042459_acb474da-2033-46ed-ab73-2b39c4056675.sql
-- ------------------------------------------------------------
UPDATE public.luxury_categories SET name = 'Hombres', slug = 'hombres', sort_order = 1 WHERE slug = 'caballeros';
UPDATE public.luxury_categories SET name = 'Mujeres', slug = 'mujeres', sort_order = 2 WHERE slug = 'damas';
UPDATE public.luxury_categories SET name = 'Línea Blanca', sort_order = 3 WHERE slug = 'lineablanca';

UPDATE public.luxury_categories c
SET parent_id = (SELECT id FROM public.luxury_categories WHERE slug = 'hombres')
WHERE c.parent_id IS NULL
  AND c.slug NOT IN ('hombres', 'mujeres', 'lineablanca');

INSERT INTO public.luxury_categories (name, slug, description, parent_id, sort_order, is_active)
SELECT c.name,
       'mujeres-' || c.slug,
       c.description,
       (SELECT id FROM public.luxury_categories WHERE slug = 'mujeres'),
       c.sort_order,
       true
FROM public.luxury_categories c
WHERE c.parent_id = (SELECT id FROM public.luxury_categories WHERE slug = 'hombres')
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 20260808190526_79791c61-950b-4992-829f-7a64c28e2bff.sql
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meta_pixel_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS meta_test_event_code text;

-- ------------------------------------------------------------
-- 20260811214925_28ed5450-5ee3-4a02-9bb3-6aaa1c6694b6.sql
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id integer PRIMARY KEY DEFAULT 1,
  telegram_enabled boolean NOT NULL DEFAULT true,
  telegram_chat_id text,
  email_enabled boolean NOT NULL DEFAULT true,
  notify_emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage notification settings" ON public.notification_settings;
CREATE POLICY "Admins manage notification settings"
ON public.notification_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'collaborator'));

INSERT INTO public.notification_settings (id, notify_emails)
VALUES (1, ARRAY['operaciones@ayoecosystem.com'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'order_notify_secret') THEN
    PERFORM vault.create_secret('__REEMPLAZAR_ORDER_NOTIFY_SECRET__', 'order_notify_secret');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'no se pudo crear el secreto order_notify_secret: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.orders_notify_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'order_notify_secret';

  PERFORM net.http_post(
    url := '__REEMPLAZAR_APP_BASE_URL__/api/public/notifications/order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('orderId', NEW.id)
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'orders_notify_new fallo (pedido conservado): %', SQLERRM;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_notify_new() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orders_notify_new() FROM anon;
REVOKE ALL ON FUNCTION public.orders_notify_new() FROM authenticated;

DROP TRIGGER IF EXISTS orders_notify_new_trg ON public.orders;
CREATE TRIGGER orders_notify_new_trg
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_notify_new();

-- ------------------------------------------------------------
-- 20260812045837_ccb1c9cc-8217-48dc-accf-51d8aca9d69f.sql
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_city text,
  ADD COLUMN IF NOT EXISTS client_region text,
  ADD COLUMN IF NOT EXISTS client_email text;

-- ------------------------------------------------------------
-- 20260819042807_04089bf3-462b-42fc-b8b6-8ef0813e5e3e.sql
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 20260819045108_3105ee6f-30ac-4d6b-8a2f-6fd5eb87711a.sql
-- ------------------------------------------------------------
CREATE TABLE public.marel_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nueva conversación',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marel_threads TO authenticated;
GRANT ALL ON public.marel_threads TO service_role;
ALTER TABLE public.marel_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marel_threads_owner_all" ON public.marel_threads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER marel_threads_touch BEFORE UPDATE ON public.marel_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX marel_threads_user_idx ON public.marel_threads (user_id, last_message_at DESC);

CREATE TABLE public.marel_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.marel_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marel_messages TO authenticated;
GRANT ALL ON public.marel_messages TO service_role;
ALTER TABLE public.marel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marel_messages_owner_all" ON public.marel_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX marel_messages_thread_idx ON public.marel_messages (thread_id, created_at);

CREATE OR REPLACE FUNCTION public.marel_validate_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('user','assistant') THEN
    RAISE EXCEPTION 'invalid role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER marel_messages_validate_role BEFORE INSERT OR UPDATE ON public.marel_messages
  FOR EACH ROW EXECUTE FUNCTION public.marel_validate_role();

