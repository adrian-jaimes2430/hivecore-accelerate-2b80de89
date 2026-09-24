-- Lectura pública de solo-lectura del catálogo activo (para que el sitio en Vercel cargue sin llaves privadas)

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.luxury_products TO anon;
GRANT SELECT ON public.luxury_categories TO anon;
GRANT SELECT ON public.luxury_brands TO anon;
GRANT SELECT ON public.luxury_promos TO anon;

CREATE POLICY "public read active products"
ON public.products FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "public read categories"
ON public.categories FOR SELECT TO anon
USING (true);

CREATE POLICY "public read active luxury products"
ON public.luxury_products FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "public read active luxury categories"
ON public.luxury_categories FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "public read active luxury brands"
ON public.luxury_brands FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "public read active luxury promos"
ON public.luxury_promos FOR SELECT TO anon
USING (is_active = true);

-- Referral público: expone solo nombre y teléfono del impulsador aprobado (para el enlace de WhatsApp)
CREATE OR REPLACE FUNCTION public.get_public_impulsador(_id uuid)
RETURNS TABLE(id uuid, full_name text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.phone
  FROM public.profiles p
  WHERE p.id = _id AND p.status = 'approved'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_impulsador(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_impulsador(uuid) TO authenticated;