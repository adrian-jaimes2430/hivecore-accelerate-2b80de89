# 03 — Importación de datos en el destino

Ejecutar **después** de `00_schema_completo.sql` en el proyecto destino y **después** de
haber migrado `auth.users` (porque `profiles.id` / `user_roles.user_id` referencian usuarios).

## 1. Silenciar triggers durante la carga

Los triggers de generación de códigos (`products_sku_trigger`, `luxury_products_sku_trigger`)
y el de notificación (`orders_notify_new_trg`) **reescribirían SKUs históricos y reenviarían
alertas de pedidos antiguos**. Desactivarlos por sesión:

```sql
BEGIN;
SET session_replication_role = replica;  -- desactiva triggers de usuario y FKs diferidas
-- ... aquí van los \copy de la sección 2 ...
SET session_replication_role = origin;
COMMIT;
```

Alternativa explícita si `session_replication_role` no está permitida:

```sql
ALTER TABLE public.products            DISABLE TRIGGER products_sku_trigger;
ALTER TABLE public.luxury_products     DISABLE TRIGGER luxury_products_sku_trigger;
ALTER TABLE public.orders              DISABLE TRIGGER orders_notify_new_trg;
-- ... carga ...
ALTER TABLE public.products            ENABLE  TRIGGER products_sku_trigger;
ALTER TABLE public.luxury_products     ENABLE  TRIGGER luxury_products_sku_trigger;
ALTER TABLE public.orders              ENABLE  TRIGGER orders_notify_new_trg;
```

## 2. Carga en orden de dependencias

Mismo orden que produce `02_export_datos.sh`. `\copy` preserva UUID, `order_code`, SKU y JSONB
tal cual salieron del origen — no transformar valores.

```
categories → profiles → user_roles → products → orders
→ luxury_categories → luxury_brands → luxury_products → luxury_promos
→ marel_threads → marel_messages
→ integrations → notification_settings
→ suppressed_emails → email_send_state → email_send_log → email_unsubscribe_tokens
```

```sql
\copy public.categories FROM 'categories.csv' WITH CSV HEADER
-- ... repetir en el orden de arriba ...
```

## 3. Secuencias

Todas las claves primarias del esquema son UUID (`gen_random_uuid()`), salvo las tablas de
cola de correo con `BIGSERIAL`. Reajustar solo esas:

```sql
SELECT setval(pg_get_serial_sequence('public.email_send_log','id'),
              COALESCE((SELECT max(id) FROM public.email_send_log), 1));
```

## 4. `integrations` — no migrar secretos como datos

Esta tabla guarda credenciales de A&O CORE OS. Cargar la fila **sin** los campos de clave y
volver a escribirlos desde el panel admin del destino, o dejar la fila vacía y reconfigurar.
Nunca versionar el CSV de esta tabla.

## 5. Verificación posterior

Ejecutar `04_matriz_verificacion.sql` y comparar contra `conteos_origen.txt`.
