-- ============================================================
-- 04 — Matriz de verificación del DESTINO
-- Solo lecturas. Ejecutar en el proyecto destino y comparar con
-- los valores del ORIGEN documentados en INFORME_AUDITORIA.md §3.
-- ============================================================

-- Esperado en origen: 17
SELECT 'tablas_base' AS componente, count(*)::text AS destino, '17' AS origen
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Esperado: 0 filas (todas las tablas con RLS activo)
SELECT 'tablas_SIN_rls' AS componente, c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- Esperado en origen: 34
SELECT 'politicas_rls' AS componente, count(*)::text AS destino, '34' AS origen
FROM pg_policies WHERE schemaname = 'public';

-- Tablas de public sin ningún GRANT a los roles del Data API (deberían ser 0)
SELECT 'tablas_sin_grants' AS componente, c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants g
    WHERE g.table_schema = 'public' AND g.table_name = c.relname
      AND g.grantee IN ('anon','authenticated','service_role')
  );

-- Esperado en origen: 17 funciones, 11 con security definer
SELECT 'funciones' AS componente,
       count(*)::text AS total,
       count(*) FILTER (WHERE p.prosecdef)::text AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

-- Esperado en origen: 14
SELECT 'triggers' AS componente, count(*)::text AS destino, '14' AS origen
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal;

-- Esperado: pg_cron, pg_net, pgcrypto, pgmq, plpgsql, supabase_vault, uuid-ossp
SELECT 'extension' AS componente, extname FROM pg_extension ORDER BY extname;

-- Esperado: app_role, user_status, order_status, impulsor_level
SELECT 'enum' AS componente, t.typname
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY 2;

-- Esperado: product-images, público
SELECT 'bucket' AS componente, id, public FROM storage.buckets;

-- Esperado en origen: 747
SELECT 'storage_objects' AS componente, count(*)::text AS destino, '747' AS origen
FROM storage.objects;

-- Conteos comparativos (origen: 12 / 44 / 30 / 5)
SELECT 'profiles' t, count(*) FROM public.profiles
UNION ALL SELECT 'products',        count(*) FROM public.products
UNION ALL SELECT 'luxury_products', count(*) FROM public.luxury_products
UNION ALL SELECT 'orders',          count(*) FROM public.orders
UNION ALL SELECT 'user_roles',      count(*) FROM public.user_roles
UNION ALL SELECT 'categories',      count(*) FROM public.categories;

-- ===== Integridad referencial y unicidad (todas deben devolver 0 filas) =====

SELECT 'order_code_duplicado' AS problema, order_code, count(*)
FROM public.orders WHERE order_code IS NOT NULL
GROUP BY order_code HAVING count(*) > 1;

SELECT 'sku_producto_duplicado' AS problema, sku, count(*)
FROM public.products WHERE sku IS NOT NULL
GROUP BY sku HAVING count(*) > 1;

SELECT 'sku_luxury_duplicado' AS problema, sku, count(*)
FROM public.luxury_products WHERE sku IS NOT NULL
GROUP BY sku HAVING count(*) > 1;

-- Colisión de SKU entre catálogo funnel y luxury (requisito de negocio: nunca deben cruzarse)
SELECT 'sku_cruzado_funnel_luxury' AS problema, p.sku
FROM public.products p JOIN public.luxury_products l ON l.sku = p.sku;

SELECT 'orders_producto_huerfano' AS problema, o.id
FROM public.orders o
WHERE o.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = o.product_id)
  AND NOT EXISTS (SELECT 1 FROM public.luxury_products l WHERE l.id = o.product_id);

SELECT 'user_roles_sin_perfil' AS problema, ur.user_id
FROM public.user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id);

SELECT 'marel_messages_sin_thread' AS problema, m.id
FROM public.marel_messages m
WHERE NOT EXISTS (SELECT 1 FROM public.marel_threads t WHERE t.id = m.thread_id);

-- Pedidos sin datos de envío obligatorios (regla de negocio vigente)
SELECT 'pedido_sin_datos_envio' AS problema, id, order_code
FROM public.orders
WHERE client_city IS NULL OR client_region IS NULL OR client_email IS NULL;

-- ===== Jobs de cron (no viajan en el dump; deben recrearse) =====
SELECT 'cron_job' AS componente, jobname, schedule FROM cron.job;
