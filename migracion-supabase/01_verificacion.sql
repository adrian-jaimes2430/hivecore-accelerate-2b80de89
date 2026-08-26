-- ============================================================
-- Verificación post-migración
-- Ejecutar en el SQL Editor del proyecto Supabase destino
-- DESPUÉS de 00_schema_completo.sql y de importar los datos.
-- ============================================================

-- 1) Tablas creadas (esperadas: 17)
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- 2) RLS activo en todas las tablas públicas (rls_enabled debe ser true en todas)
select c.relname as tabla, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 3) Tablas SIN políticas (deberían aparecer 0 filas; si aparece alguna, queda bloqueada)
select c.relname as tabla_sin_politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
order by 1;

-- 4) GRANTs por tabla (cada tabla usada por la app debe tener authenticated y/o anon)
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;

-- 5) Funciones de seguridad y triggers
select p.proname as funcion, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

select event_object_table as tabla, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by 1, 2;

-- 6) Extensiones requeridas (pg_net, pg_cron, pgmq, supabase_vault, pgcrypto)
select extname from pg_extension order by extname;

-- 7) Buckets de storage
select id, name, public, file_size_limit from storage.buckets order by id;

-- 8) Conteo de filas por tabla clave (comparar con el proyecto origen)
select 'profiles' t, count(*) from public.profiles
union all select 'user_roles', count(*) from public.user_roles
union all select 'categories', count(*) from public.categories
union all select 'products', count(*) from public.products
union all select 'luxury_categories', count(*) from public.luxury_categories
union all select 'luxury_brands', count(*) from public.luxury_brands
union all select 'luxury_products', count(*) from public.luxury_products
union all select 'luxury_promos', count(*) from public.luxury_promos
union all select 'orders', count(*) from public.orders
union all select 'integrations', count(*) from public.integrations
union all select 'notification_settings', count(*) from public.notification_settings
union all select 'marel_threads', count(*) from public.marel_threads
union all select 'marel_messages', count(*) from public.marel_messages
order by 1;

-- 9) Integridad referencial: pedidos apuntando a impulsadores inexistentes
select count(*) as pedidos_con_impulsador_huerfano
from public.orders o
where o.impulsador_id is not null
  and not exists (select 1 from public.profiles p where p.id = o.impulsador_id);

-- 10) Secuencia / unicidad de códigos de pedido y SKU
select count(*) as order_codes_duplicados from (
  select order_code from public.orders group by order_code having count(*) > 1
) x;
select count(*) as skus_luxury_duplicados from (
  select sku from public.luxury_products where sku is not null group by sku having count(*) > 1
) x;
