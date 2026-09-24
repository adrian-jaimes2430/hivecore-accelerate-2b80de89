-- ============================================================
-- HiveCore / AnMa Luxury — esquema completo (snapshot del backend actual)
-- Generado: 2026-09-24 UTC desde la base de datos en producción (pg_dump --schema-only).
-- Incluye: 17 tablas, 34 políticas RLS, funciones, triggers, GRANTs,
--   columnas impulsador_deleted_* en orders, secondary_category_ids, variaciones,
--   videos, precios x2/x3, Meta Pixel por producto, tablas de correo gestionado.
-- Reemplazar antes de ejecutar: __REEMPLAZAR_APP_BASE_URL__ (dominio final, sin '/').
-- El secreto del trigger se lee de vault: crear 'order_notify_secret' (NUEVO).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'collaborator',
    'impulsador'
);


--
-- Name: impulsor_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.impulsor_level AS ENUM (
    'junior',
    'senior',
    'lider',
    'staff_matriz'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'pending',
    'approved',
    'blocked'
);


--
-- Name: generate_luxury_sku(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_luxury_sku() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'LUX-' || upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_product_sku(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_product_sku() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'AYO-' || upper(substring(replace(gen_random_uuid()::text,'-',''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


--
-- Name: is_approved(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_approved(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;


--
-- Name: marel_validate_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.marel_validate_role() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.role NOT IN ('user','assistant') THEN
    RAISE EXCEPTION 'invalid role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: orders_notify_new(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.orders_notify_new() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: orders_validate_meta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.orders_validate_meta() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


--
-- Name: profiles_guard_level(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.profiles_guard_level() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT 'green'::text,
    icon text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_send_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_send_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text,
    template_name text NOT NULL,
    recipient_email text NOT NULL,
    status text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_send_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])))
);


--
-- Name: email_send_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_send_state (
    id integer DEFAULT 1 NOT NULL,
    retry_after_until timestamp with time zone,
    batch_size integer DEFAULT 10 NOT NULL,
    send_delay_ms integer DEFAULT 200 NOT NULL,
    auth_email_ttl_minutes integer DEFAULT 15 NOT NULL,
    transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_send_state_id_check CHECK ((id = 1))
);


--
-- Name: email_unsubscribe_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_unsubscribe_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    api_key text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    webhook_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    orders_sent integer DEFAULT 0 NOT NULL,
    last_sent_at timestamp with time zone,
    last_status text,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: luxury_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luxury_brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: luxury_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luxury_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    parent_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: luxury_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luxury_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku text,
    name text NOT NULL,
    slug text NOT NULL,
    short_description text,
    description text,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    category_id uuid,
    brand_id uuid,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    suggested_retail_price numeric(12,2) DEFAULT 0 NOT NULL,
    stock_status text DEFAULT 'in_stock'::text NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    videos jsonb DEFAULT '[]'::jsonb NOT NULL,
    variations jsonb DEFAULT '[]'::jsonb NOT NULL,
    show_impulsador_price boolean DEFAULT true NOT NULL,
    secondary_category_ids jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: luxury_promos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luxury_promos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    subtitle text,
    media_type text DEFAULT 'image'::text NOT NULL,
    media_url text NOT NULL,
    link_url text,
    cta_label text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT luxury_promos_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])))
);


--
-- Name: marel_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marel_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marel_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marel_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT 'Nueva conversación'::text NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id integer DEFAULT 1 NOT NULL,
    telegram_enabled boolean DEFAULT true NOT NULL,
    telegram_chat_id text,
    email_enabled boolean DEFAULT true NOT NULL,
    notify_emails text[] DEFAULT ARRAY[]::text[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_settings_singleton CHECK ((id = 1))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_code text DEFAULT ('HC-'::text || upper("substring"((gen_random_uuid())::text, 1, 8))) NOT NULL,
    impulsador_id uuid,
    product_id uuid,
    client_name text NOT NULL,
    client_phone text NOT NULL,
    client_address text,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    total numeric(12,2),
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    luxury_product_id uuid,
    external_synced_at timestamp with time zone,
    external_ref text,
    external_error text,
    source text DEFAULT 'impulsador'::text NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    payment_provider text,
    payment_reference text,
    payment_transaction_id text,
    payment_amount numeric,
    paid_at timestamp with time zone,
    client_city text,
    client_region text,
    client_email text,
    impulsador_deleted_id uuid,
    impulsador_deleted_name text,
    impulsador_deleted_email text,
    impulsador_deleted_phone text
);


--
-- Name: COLUMN orders.impulsador_deleted_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.impulsador_deleted_id IS 'Historical user id retained when an impulsador account is permanently deleted.';


--
-- Name: COLUMN orders.impulsador_deleted_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.impulsador_deleted_name IS 'Historical impulsador display name retained after account deletion.';


--
-- Name: COLUMN orders.impulsador_deleted_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.impulsador_deleted_email IS 'Historical impulsador email retained after account deletion.';


--
-- Name: COLUMN orders.impulsador_deleted_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.impulsador_deleted_phone IS 'Historical impulsador phone retained after account deletion.';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    category_id uuid,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    upsell_price numeric(12,2),
    short_description text,
    description text,
    benefits jsonb DEFAULT '[]'::jsonb,
    images jsonb DEFAULT '[]'::jsonb,
    funnel_sections jsonb DEFAULT '[]'::jsonb,
    cta_label text DEFAULT 'Pedir ahora'::text,
    is_featured boolean DEFAULT false,
    is_trending boolean DEFAULT false,
    is_new boolean DEFAULT false,
    is_bestseller boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sku text NOT NULL,
    secondary_category_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    bundle_pricing_enabled boolean DEFAULT false NOT NULL,
    price_2 numeric,
    price_3 numeric,
    meta_pixel_enabled boolean DEFAULT false NOT NULL,
    meta_pixel_id text,
    meta_test_event_code text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    status public.user_status DEFAULT 'pending'::public.user_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    level public.impulsor_level DEFAULT 'junior'::public.impulsor_level NOT NULL,
    level_updated_at timestamp with time zone,
    level_updated_by uuid
);


--
-- Name: suppressed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppressed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: email_send_log email_send_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_send_log
    ADD CONSTRAINT email_send_log_pkey PRIMARY KEY (id);


--
-- Name: email_send_state email_send_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_send_state
    ADD CONSTRAINT email_send_state_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token);


--
-- Name: integrations integrations_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_api_key_key UNIQUE (api_key);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: luxury_brands luxury_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_brands
    ADD CONSTRAINT luxury_brands_pkey PRIMARY KEY (id);


--
-- Name: luxury_brands luxury_brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_brands
    ADD CONSTRAINT luxury_brands_slug_key UNIQUE (slug);


--
-- Name: luxury_categories luxury_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_categories
    ADD CONSTRAINT luxury_categories_pkey PRIMARY KEY (id);


--
-- Name: luxury_categories luxury_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_categories
    ADD CONSTRAINT luxury_categories_slug_key UNIQUE (slug);


--
-- Name: luxury_products luxury_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_products
    ADD CONSTRAINT luxury_products_pkey PRIMARY KEY (id);


--
-- Name: luxury_products luxury_products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_products
    ADD CONSTRAINT luxury_products_sku_key UNIQUE (sku);


--
-- Name: luxury_products luxury_products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_products
    ADD CONSTRAINT luxury_products_slug_key UNIQUE (slug);


--
-- Name: luxury_promos luxury_promos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_promos
    ADD CONSTRAINT luxury_promos_pkey PRIMARY KEY (id);


--
-- Name: marel_messages marel_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marel_messages
    ADD CONSTRAINT marel_messages_pkey PRIMARY KEY (id);


--
-- Name: marel_threads marel_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marel_threads
    ADD CONSTRAINT marel_threads_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_code_key UNIQUE (order_code);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: suppressed_emails suppressed_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_email_key UNIQUE (email);


--
-- Name: suppressed_emails suppressed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_email_send_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);


--
-- Name: idx_email_send_log_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_message ON public.email_send_log USING btree (message_id);


--
-- Name: idx_email_send_log_message_sent_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);


--
-- Name: idx_email_send_log_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);


--
-- Name: idx_luxury_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_luxury_products_active ON public.luxury_products USING btree (is_active);


--
-- Name: idx_luxury_products_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_luxury_products_brand ON public.luxury_products USING btree (brand_id);


--
-- Name: idx_luxury_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_luxury_products_category ON public.luxury_products USING btree (category_id);


--
-- Name: idx_suppressed_emails_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);


--
-- Name: idx_unsubscribe_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);


--
-- Name: marel_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marel_messages_thread_idx ON public.marel_messages USING btree (thread_id, created_at);


--
-- Name: marel_threads_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marel_threads_user_idx ON public.marel_threads USING btree (user_id, last_message_at DESC);


--
-- Name: orders_luxury_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_luxury_product_id_idx ON public.orders USING btree (luxury_product_id);


--
-- Name: orders_payment_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_payment_reference_key ON public.orders USING btree (payment_reference);


--
-- Name: products_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);


--
-- Name: integrations integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: luxury_products luxury_products_sku_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER luxury_products_sku_trigger BEFORE INSERT ON public.luxury_products FOR EACH ROW EXECUTE FUNCTION public.generate_luxury_sku();


--
-- Name: luxury_promos luxury_promos_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER luxury_promos_touch_updated_at BEFORE UPDATE ON public.luxury_promos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: marel_messages marel_messages_validate_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER marel_messages_validate_role BEFORE INSERT OR UPDATE ON public.marel_messages FOR EACH ROW EXECUTE FUNCTION public.marel_validate_role();


--
-- Name: marel_threads marel_threads_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER marel_threads_touch BEFORE UPDATE ON public.marel_threads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders orders_notify_new_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_notify_new_trg AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_notify_new();


--
-- Name: orders orders_validate_meta_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_validate_meta_trg BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_validate_meta();


--
-- Name: products products_sku_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_sku_trigger BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.generate_product_sku();


--
-- Name: products products_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles profiles_guard_level; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_guard_level BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_level();


--
-- Name: profiles profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: luxury_brands touch_luxury_brands; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_luxury_brands BEFORE UPDATE ON public.luxury_brands FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: luxury_categories touch_luxury_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_luxury_categories BEFORE UPDATE ON public.luxury_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: luxury_products touch_luxury_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_luxury_products BEFORE UPDATE ON public.luxury_products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: luxury_categories luxury_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_categories
    ADD CONSTRAINT luxury_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.luxury_categories(id) ON DELETE SET NULL;


--
-- Name: luxury_products luxury_products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_products
    ADD CONSTRAINT luxury_products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.luxury_brands(id) ON DELETE SET NULL;


--
-- Name: luxury_products luxury_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luxury_products
    ADD CONSTRAINT luxury_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.luxury_categories(id) ON DELETE SET NULL;


--
-- Name: marel_messages marel_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marel_messages
    ADD CONSTRAINT marel_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.marel_threads(id) ON DELETE CASCADE;


--
-- Name: marel_messages marel_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marel_messages
    ADD CONSTRAINT marel_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: marel_threads marel_threads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marel_threads
    ADD CONSTRAINT marel_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_impulsador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_impulsador_id_fkey FOREIGN KEY (impulsador_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_luxury_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_luxury_product_id_fkey FOREIGN KEY (luxury_product_id) REFERENCES public.luxury_products(id) ON DELETE SET NULL;


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orders Admins delete orders; Type: POLICY; Schema: public; Owner: -
-- ===== Esquema app_private (usado por políticas RLS y storage) =====
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9


--
-- Name: app_private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app_private;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: app_private; Owner: -
--

CREATE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_approved(uuid); Type: FUNCTION; Schema: app_private; Owner: -
--

CREATE FUNCTION app_private.is_approved(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'approved'
  )
$$;


--
-- Name: SCHEMA app_private; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA app_private TO authenticated;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: app_private; Owner: -
--

GRANT ALL ON FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) TO authenticated;


--
-- Name: FUNCTION is_approved(_user_id uuid); Type: ACL; Schema: app_private; Owner: -
--

GRANT ALL ON FUNCTION app_private.is_approved(_user_id uuid) TO authenticated;


--
-- PostgreSQL database dump complete
--




--

CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING ((app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: luxury_brands Admins manage brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage brands" ON public.luxury_brands TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: integrations Admins manage integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage integrations" ON public.integrations TO authenticated USING ((public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'collaborator'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: luxury_categories Admins manage luxury categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage luxury categories" ON public.luxury_categories TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: luxury_products Admins manage luxury products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage luxury products" ON public.luxury_products TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: notification_settings Admins manage notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage notification settings" ON public.notification_settings TO authenticated USING ((public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'collaborator'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: products Admins manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage products" ON public.products TO authenticated USING ((app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role))) WITH CHECK ((app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: user_roles Admins manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage roles" ON public.user_roles TO authenticated USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (app_private.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: profiles Admins update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: orders Admins update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING ((app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: categories Admins write categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins write categories" ON public.categories TO authenticated USING ((app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role))) WITH CHECK ((app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: orders Approved users create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (((auth.uid() = impulsador_id) AND app_private.is_approved(auth.uid())));


--
-- Name: categories Approved users read categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read categories" ON public.categories FOR SELECT TO authenticated USING (app_private.is_approved(auth.uid()));


--
-- Name: products Approved users read products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users read products" ON public.products FOR SELECT TO authenticated USING ((app_private.is_approved(auth.uid()) AND (is_active = true)));


--
-- Name: luxury_brands Approved users view active brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users view active brands" ON public.luxury_brands FOR SELECT TO authenticated USING (((is_active = true) AND public.is_approved(auth.uid())));


--
-- Name: luxury_categories Approved users view active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users view active categories" ON public.luxury_categories FOR SELECT TO authenticated USING (((is_active = true) AND public.is_approved(auth.uid())));


--
-- Name: luxury_products Approved users view active luxury products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved users view active luxury products" ON public.luxury_products FOR SELECT TO authenticated USING (((is_active = true) AND public.is_approved(auth.uid())));


--
-- Name: orders Impulsadores see own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Impulsadores see own orders" ON public.orders FOR SELECT TO authenticated USING (((auth.uid() = impulsador_id) OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role) OR app_private.has_role(auth.uid(), 'collaborator'::public.app_role)));


--
-- Name: email_send_log Service role can insert send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: suppressed_emails Service role can insert suppressed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can insert tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_send_state Service role can manage send state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage send state" ON public.email_send_state USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can mark tokens as used; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_send_log Service role can read send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: suppressed_emails Service role can read suppressed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can read tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: email_send_log Service role can update send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: user_roles Users see own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = id) OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: email_send_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

--
-- Name: email_send_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

--
-- Name: email_unsubscribe_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: luxury_brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luxury_brands ENABLE ROW LEVEL SECURITY;

--
-- Name: luxury_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luxury_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: luxury_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luxury_products ENABLE ROW LEVEL SECURITY;

--
-- Name: luxury_promos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.luxury_promos ENABLE ROW LEVEL SECURITY;

--
-- Name: marel_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marel_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: marel_messages marel_messages_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY marel_messages_owner_all ON public.marel_messages TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: marel_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marel_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: marel_threads marel_threads_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY marel_threads_owner_all ON public.marel_threads TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: luxury_promos promos admin manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "promos admin manage" ON public.luxury_promos TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: luxury_promos promos public read active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "promos public read active" ON public.luxury_promos FOR SELECT USING ((is_active = true));


--
-- Name: suppressed_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO sandbox_exec;


--
-- Name: FUNCTION generate_luxury_sku(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.generate_luxury_sku() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_luxury_sku() TO service_role;


--
-- Name: FUNCTION generate_product_sku(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.generate_product_sku() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_product_sku() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;


--
-- Name: FUNCTION is_approved(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_approved(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_approved(_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.is_approved(_user_id uuid) TO authenticated;


--
-- Name: FUNCTION marel_validate_role(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.marel_validate_role() TO anon;
GRANT ALL ON FUNCTION public.marel_validate_role() TO authenticated;
GRANT ALL ON FUNCTION public.marel_validate_role() TO service_role;


--
-- Name: FUNCTION orders_notify_new(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.orders_notify_new() FROM PUBLIC;
GRANT ALL ON FUNCTION public.orders_notify_new() TO service_role;


--
-- Name: FUNCTION orders_validate_meta(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.orders_validate_meta() FROM PUBLIC;
GRANT ALL ON FUNCTION public.orders_validate_meta() TO anon;
GRANT ALL ON FUNCTION public.orders_validate_meta() TO authenticated;
GRANT ALL ON FUNCTION public.orders_validate_meta() TO service_role;


--
-- Name: FUNCTION profiles_guard_level(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.profiles_guard_level() FROM PUBLIC;
GRANT ALL ON FUNCTION public.profiles_guard_level() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;
GRANT SELECT,INSERT ON TABLE public.categories TO sandbox_exec;


--
-- Name: TABLE email_send_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_send_log TO anon;
GRANT ALL ON TABLE public.email_send_log TO authenticated;
GRANT ALL ON TABLE public.email_send_log TO service_role;
GRANT SELECT,INSERT ON TABLE public.email_send_log TO sandbox_exec;


--
-- Name: TABLE email_send_state; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_send_state TO anon;
GRANT ALL ON TABLE public.email_send_state TO authenticated;
GRANT ALL ON TABLE public.email_send_state TO service_role;
GRANT SELECT,INSERT ON TABLE public.email_send_state TO sandbox_exec;


--
-- Name: TABLE email_unsubscribe_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.email_unsubscribe_tokens TO anon;
GRANT ALL ON TABLE public.email_unsubscribe_tokens TO authenticated;
GRANT ALL ON TABLE public.email_unsubscribe_tokens TO service_role;
GRANT SELECT,INSERT ON TABLE public.email_unsubscribe_tokens TO sandbox_exec;


--
-- Name: TABLE integrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.integrations TO anon;
GRANT ALL ON TABLE public.integrations TO authenticated;
GRANT ALL ON TABLE public.integrations TO service_role;
GRANT SELECT,INSERT ON TABLE public.integrations TO sandbox_exec;


--
-- Name: TABLE luxury_brands; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luxury_brands TO anon;
GRANT ALL ON TABLE public.luxury_brands TO authenticated;
GRANT ALL ON TABLE public.luxury_brands TO service_role;
GRANT SELECT,INSERT ON TABLE public.luxury_brands TO sandbox_exec;


--
-- Name: TABLE luxury_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luxury_categories TO anon;
GRANT ALL ON TABLE public.luxury_categories TO authenticated;
GRANT ALL ON TABLE public.luxury_categories TO service_role;
GRANT SELECT,INSERT ON TABLE public.luxury_categories TO sandbox_exec;


--
-- Name: TABLE luxury_products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luxury_products TO anon;
GRANT ALL ON TABLE public.luxury_products TO authenticated;
GRANT ALL ON TABLE public.luxury_products TO service_role;
GRANT SELECT,INSERT ON TABLE public.luxury_products TO sandbox_exec;


--
-- Name: TABLE luxury_promos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.luxury_promos TO anon;
GRANT ALL ON TABLE public.luxury_promos TO authenticated;
GRANT ALL ON TABLE public.luxury_promos TO service_role;
GRANT SELECT,INSERT ON TABLE public.luxury_promos TO sandbox_exec;


--
-- Name: TABLE marel_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marel_messages TO anon;
GRANT ALL ON TABLE public.marel_messages TO authenticated;
GRANT ALL ON TABLE public.marel_messages TO service_role;
GRANT SELECT,INSERT ON TABLE public.marel_messages TO sandbox_exec;


--
-- Name: TABLE marel_threads; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.marel_threads TO anon;
GRANT ALL ON TABLE public.marel_threads TO authenticated;
GRANT ALL ON TABLE public.marel_threads TO service_role;
GRANT SELECT,INSERT ON TABLE public.marel_threads TO sandbox_exec;


--
-- Name: TABLE notification_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_settings TO anon;
GRANT ALL ON TABLE public.notification_settings TO authenticated;
GRANT ALL ON TABLE public.notification_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.notification_settings TO sandbox_exec;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT SELECT,INSERT ON TABLE public.orders TO sandbox_exec;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;
GRANT SELECT,INSERT ON TABLE public.products TO sandbox_exec;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT ON TABLE public.profiles TO sandbox_exec;


--
-- Name: TABLE suppressed_emails; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.suppressed_emails TO anon;
GRANT ALL ON TABLE public.suppressed_emails TO authenticated;
GRANT ALL ON TABLE public.suppressed_emails TO service_role;
GRANT SELECT,INSERT ON TABLE public.suppressed_emails TO sandbox_exec;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_roles TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--



-- ===== Trigger sobre auth.users (no incluido en el dump de public) =====
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Storage =====
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images','product-images', true)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Admins upload product-images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'product-images'::text) AND (app_private.has_role(auth.uid(), 'super_admin'::app_role) OR app_private.has_role(auth.uid(), 'collaborator'::app_role))));
CREATE POLICY "Admins update product-images" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'product-images'::text) AND (app_private.has_role(auth.uid(), 'super_admin'::app_role) OR app_private.has_role(auth.uid(), 'collaborator'::app_role))));
CREATE POLICY "Admins delete product-images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'product-images'::text) AND (app_private.has_role(auth.uid(), 'super_admin'::app_role) OR app_private.has_role(auth.uid(), 'collaborator'::app_role))));
CREATE POLICY "Public read product image files" ON storage.objects AS PERMISSIVE FOR SELECT TO anon,authenticated USING (((bucket_id = 'product-images'::text) AND (name ~~ 'products/%'::text) AND (lower(storage.extension(name)) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text, 'webp'::text, 'gif'::text, 'avif'::text]))));
