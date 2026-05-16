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