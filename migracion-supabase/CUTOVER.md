# Plan de cutover — HIVECORE → Supabase propio

Este documento **no** se ha ejecutado. El origen (Lovable Cloud) sigue intacto y operativo.

## Paso 0 — BLOQUEANTE actual

Hoy solo hay **un** proyecto Supabase vinculado, y es el gestionado por Lovable
(`bvzzqbharriukyrgondu`). No hay proyecto externo `hivecore` conectado, así que no existe
destino contra el que aplicar esquema ni datos. El vínculo al backend gestionado no se puede
reapuntar desde el chat: hay que conectar el proyecto propio mediante la integración de
Supabase del proyecto de Lovable. Hasta que eso ocurra, las fases 2 a 6 quedan pendientes.

## Paso 1 — Esquema en el destino

```
psql "<CONEXIÓN_DESTINO>" -f migracion-supabase/00_schema_completo.sql
```

Antes de ejecutar, reemplazar los placeholders:

| Placeholder | Valor |
| --- | --- |
| `__REEMPLAZAR_APP_BASE_URL__` | dominio público final de la app (sin `/` final) |
| `__REEMPLAZAR_ORDER_NOTIFY_SECRET__` | secreto **nuevo** (el anterior está comprometido) |

Comprobar primero que el destino esté vacío:
`SELECT count(*) FROM information_schema.tables WHERE table_schema='public';`

Si `pgmq` o `pg_cron` no están disponibles en el plan del destino, **parar y reportar**: la
cola de correo y el wake programado dependen de ellas y no tienen sustituto equivalente.

## Paso 2 — Auth

Exportación oficial de usuarios de Supabase (incluye `id` y `encrypted_password`) e
importación en el destino. Sin esa exportación, los 12 usuarios deben restablecer contraseña:
decidirlo **antes** del cutover, no durante.

## Paso 3 — Datos

`02_export_datos.sh` → `03_import_datos.md` (triggers de SKU y de notificación desactivados
durante la carga) → `04_matriz_verificacion.sql`.

## Paso 4 — Storage

Crear el bucket `product-images` como **público** y copiar los 747 objetos preservando la ruta
exacta (`bucket_id` + `name`). Solo cambia el host en las URLs guardadas en base de datos:

```sql
UPDATE public.products
SET image_url = replace(image_url,
  'https://bvzzqbharriukyrgondu.supabase.co', 'https://<REF_DESTINO>.supabase.co')
WHERE image_url LIKE '%bvzzqbharriukyrgondu%';
```
Repetir en cada columna de imagen/media (incluidas las JSONB de galería y funnel).
No alterar las rutas internas.

## Paso 5 — Secrets a recrear en el destino

Todos por gestión de secretos, nunca en código ni en SQL versionado:

`WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`,
`META_CAPI_ACCESS_TOKEN`, `TELEGRAM_API_KEY`, `AOCORE_INBOUND_SECRET`,
`ORDER_NOTIFY_SECRET` (**rotar**), `LOVABLE_API_KEY` (Marel),
y en `vault`: `order_notify_secret`, `email_queue_service_role_key`.

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y las variantes
`VITE_` las genera la conexión: no escribirlas a mano.

## Paso 6 — Jobs de cron

Recrear el job de `email_queue_wake` en el destino (`cron.schedule`). No viaja en el dump.

## Paso 7 — URLs y webhooks a reapuntar (solo en el cutover)

| Integración | Qué cambia |
| --- | --- |
| Wompi | URL de eventos → `<dominio>/api/public/webhooks/wompi` |
| A&O CORE OS | endpoint entrante → `<dominio>/api/public/aocore/...` y su HMAC |
| Notificación de pedidos | trigger `orders_notify_new` → `<dominio>/api/public/notifications/order` |
| Meta | Pixel + CAPI apuntando al dominio final |
| Feeds públicos | `/api/public/catalog`, `/api/public/catalog-feed`, `/productos` |
| OAuth | Redirect URLs y Site URL del destino con el dominio final |

## Paso 8 — Orden de cambio

1. Destino verde en `04_matriz_verificacion.sql`.
2. Congelar pedidos (ventana corta de mantenimiento).
3. Delta final de `orders` y `marel_*` (las tablas que siguen creciendo).
4. Reapuntar la app al destino y publicar.
5. Reapuntar webhooks externos (Wompi, AOCORE) y el trigger de notificación.
6. Prueba de humo: login, catálogo público, pedido COD, pedido Wompi, alerta de Telegram.
7. Solo entonces evaluar el origen — sin borrar nada durante los primeros días.

## Rollback

El origen queda intacto y sin escrituras redirigidas hasta el paso 4. Revertir = reapuntar la
app y los webhooks al origen y republicar; los pedidos creados en el destino durante la ventana
deben reinsertarse manualmente en el origen (por eso la ventana debe ser corta).
