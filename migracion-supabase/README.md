# Migración del backend a un proyecto Supabase propio

Guía completa para mover HiveCore / AnMa Luxury desde el backend gestionado (Lovable Cloud) a un proyecto Supabase propio.

## Lo primero que debes saber

No existe migración automática de un clic. Y hay un límite importante: **una vez que Cloud está activo en este proyecto, no se puede desconectar**. Restaurar una versión anterior tampoco lo quita. Por tanto la migración real es:

1. Exportar todo de este backend.
2. Crear tu proyecto Supabase.
3. Reconstruir el esquema con `00_schema_completo.sql`.
4. Importar datos y usuarios.
5. Crear un **proyecto nuevo de Lovable conectado a tu Supabase** y llevar el código allí (el código de esta app funciona tal cual: usa los clientes generados y variables de entorno, no rutas fijas).

Este proyecto seguirá funcionando con Cloud mientras hagas la transición, así que no hay ventana de caída.

## Archivos de esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `00_schema_completo.sql` | Esquema completo consolidado: 17 tablas, RLS, GRANTs, funciones, triggers, extensiones, buckets y políticas de storage. Es la concatenación en orden histórico de las 29 migraciones. |
| `01_verificacion.sql` | 10 consultas de comprobación para confirmar que el destino quedó idéntico (RLS, GRANTs, triggers, buckets, conteos, integridad). |

---

## Paso 1 — Exportar los datos actuales

En el proyecto de Lovable: **Configuración del proyecto → pestaña Cloud → Advanced settings → Export data**.

Descarga:
- Datos de las tablas del esquema `public`.
- Usuarios de `auth.users` (se exportan aparte; los hashes de contraseña viajan en la exportación de auth, así que tus impulsadores no tienen que volver a registrarse).
- Archivos del bucket `product-images` (imágenes y videos de funnels, galerías luxury y promos).

Guarda también, por si acaso, la lista de `id` de `profiles`: los enlaces públicos de referido (`?ref=<uuid>`) dependen de que esos UUID se conserven. La exportación los conserva; no regeneres IDs.

## Paso 2 — Crear el proyecto Supabase

En [supabase.com](https://supabase.com) → New project.

- **Región**: elige la más cercana a Colombia (`us-east-1` o `sa-east-1`) para bajar latencia en checkout.
- **Plan**: la app usa `pg_net`, `pg_cron`, `pgmq` y `supabase_vault`. Todas están disponibles en el plan Free, pero `pg_cron` con jobs frecuentes y el volumen de storage de video conviene revisarlo en Pro.
- Guarda la contraseña de base de datos: la necesitarás para `psql` en el paso 4.

## Paso 3 — Reconstruir el esquema

En el SQL Editor de tu proyecto nuevo, ejecuta `00_schema_completo.sql` **completo y de una sola vez**, sin reordenar. Contiene, en orden:

- Extensiones: `pgcrypto`, `pg_net`, `pg_cron`, `pgmq`, `supabase_vault`.
- Enums: `app_role`, `impulsor_level`, estados de pedido y de pago.
- Tablas: `profiles`, `user_roles`, `categories`, `products`, `luxury_categories`, `luxury_brands`, `luxury_products`, `luxury_promos`, `orders`, `integrations`, `notification_settings`, `marel_threads`, `marel_messages` y las 4 de infraestructura de correo.
- Funciones `security definer`: `has_role`, `is_approved`, generación de `order_code` y de SKU `LUX-XXXXXXXX`, `update_updated_at_column`.
- Triggers: `updated_at`, creación de perfil al registrarse, asignación de SKU, y el trigger de notificación de pedidos vía `pg_net`.
- RLS y políticas de todas las tablas + GRANTs a `anon` / `authenticated` / `service_role`.
- Bucket `product-images` con sus 4 políticas de storage.

Si alguna sentencia falla, no continúes: corrige y reejecuta desde ese punto. Los `DROP POLICY IF EXISTS` hacen que el script sea reejecutable sin romperse.

## Paso 4 — Importar usuarios y datos

**Primero los usuarios**, porque `profiles.id` referencia `auth.users.id`. Importa la exportación de auth con el CLI de Supabase (`supabase db dump` / `psql`) o el importador de usuarios del dashboard.

**Después los datos**, en este orden exacto para no violar llaves foráneas:

```
1. profiles
2. user_roles
3. categories                 (padres antes que hijas: Hombres, Mujeres, Línea Blanca primero)
4. products
5. luxury_categories
6. luxury_brands
7. luxury_products
8. luxury_promos
9. orders                     (referencia profiles, products y luxury_products)
10. integrations
11. notification_settings
12. marel_threads
13. marel_messages
14. email_send_log / email_send_state / email_unsubscribe_tokens / suppressed_emails
```

Al importar `orders`, desactiva temporalmente los triggers para que no se regeneren `order_code` ni se reenvíen notificaciones de pedidos históricos:

```sql
alter table public.orders disable trigger all;
-- ... importar filas ...
alter table public.orders enable trigger all;
```

Lo mismo con `luxury_products` para conservar los SKU originales.

Finalmente sube los archivos al bucket `product-images` **manteniendo las mismas rutas**: las URLs de imágenes y videos están guardadas dentro de columnas JSONB (`images`, `funnel_sections`, `media`) y solo cambia el dominio del proyecto. Si la ruta cambia, se rompen las galerías.

### Reescritura de URLs de storage

Después de subir los archivos, actualiza el host en las columnas JSONB (reemplaza `NUEVO_REF` por el ref de tu proyecto):

```sql
update public.products
set images = replace(images::text, 'bvzzqbharriukyrgondu.supabase.co', 'NUEVO_REF.supabase.co')::jsonb,
    funnel_sections = replace(funnel_sections::text, 'bvzzqbharriukyrgondu.supabase.co', 'NUEVO_REF.supabase.co')::jsonb;

update public.luxury_products
set media = replace(media::text, 'bvzzqbharriukyrgondu.supabase.co', 'NUEVO_REF.supabase.co')::jsonb;

update public.luxury_promos
set media = replace(media::text, 'bvzzqbharriukyrgondu.supabase.co', 'NUEVO_REF.supabase.co')::jsonb;
```

## Paso 5 — Configurar Auth

En Authentication → Providers y Settings de tu proyecto:

- **Email/contraseña**: activado. Confirmación de correo: igual que hoy (sin auto-confirmación).
- **Google**: hay que volver a crear las credenciales OAuth y registrar la URL de callback del nuevo proyecto. Sin esto, el primer intento de login social falla con "Unsupported provider".
- **Site URL y Redirect URLs**: añade el dominio del proyecto nuevo. Si no, el login queda en bucle.
- **Sign-ups anónimos**: desactivados.

## Paso 6 — Volver a cargar los secretos

Ninguno viaja en la exportación. Hay que crearlos de nuevo en el proyecto destino:

| Secreto | De dónde sale |
| --- | --- |
| `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY` | Dashboard de Wompi |
| `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Wompi (firma de checkout y de webhooks) |
| `META_CAPI_ACCESS_TOKEN` | Meta Events Manager (Conversions API) |
| `TELEGRAM_API_KEY` | BotFather (@Vatsalya_anma_bot) |
| `AOCORE_INBOUND_SECRET` | El mismo valor que usa A&O CORE OS para firmar HMAC |
| `ORDER_NOTIFY_SECRET` | Puedes generar uno nuevo |
| `LOVABLE_API_KEY` | Lo provee el proyecto nuevo de Lovable (Marel usa la pasarela de IA) |
| `META_PIXEL_ID` / `VITE_META_PIXEL_ID` | `472716435746433` (no cambia) |

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y las variantes `VITE_` las genera la conexión al conectar Supabase; no las escribas a mano.

## Paso 7 — Reapuntar integraciones externas

Estos servicios tienen URLs de este proyecto guardadas y hay que actualizarlas:

- **Webhook de Wompi** → `https://<nuevo-dominio>/api/public/webhooks/wompi`
- **A&O CORE OS (entrante)** → `https://<nuevo-dominio>/api/public/integrations/aocore/order`
- **A&O CORE OS (saliente)**: la URL destino vive en la tabla `integrations`; revisa que se haya migrado con su API key.
- **Notificación de pedidos**: el trigger `pg_net` de `orders` lleva la URL embebida. Actualízala:

  ```sql
  -- Reemplaza el dominio dentro del cuerpo de la función de notificación
  select prosrc from pg_proc where proname like '%notify%order%';
  ```

  Luego recrea la función con el dominio nuevo.
- **Job de `pg_cron`** de la cola de correo: reprográmalo apuntando al nuevo dominio y con la service role key guardada en `supabase_vault`.
- **Feeds públicos** que ya diste a SalesADS / Meta / Google: `/productos`, `/api/public/catalog`, `/api/public/catalog-feed`, `/api/public/media`. Si el dominio cambia, actualízalos en cada plataforma.
- **Números de WhatsApp**: siguen en código (`src/lib/whatsapp.ts`), no requieren migración.

## Paso 8 — Verificar

Ejecuta `01_verificacion.sql` y confirma:

- 17 tablas, todas con RLS activo y con políticas.
- GRANTs presentes para `authenticated` (y `anon` solo en las de lectura pública: catálogo, productos activos, promos).
- Triggers y funciones `security definer` presentes.
- Buckets y extensiones creados.
- Conteos de filas iguales a los del origen y 0 filas huérfanas / 0 duplicados de `order_code` y SKU.

Después, pruebas funcionales en este orden:

1. Login de un impulsador existente y de super admin.
2. El botón **Admin** aparece para super admin, y `/admin/luxury` abre sin error.
3. Catálogo público `/productos` y `/catalogo` cargan con imágenes y videos.
4. Un funnel público completo: validación de campos obligatorios → pedido contra entrega → llega la alerta a Telegram.
5. Un pedido con pago en línea → checkout de Wompi → webhook actualiza el estado.
6. Meta CAPI registra la compra (Events Manager → Test Events).
7. Marel responde en el chat interno y en el burbuja pública.
8. Niveles: un usuario Junior no ve el catálogo Luxury; Senior sí.

## Qué se pierde y qué no

**Se conserva**: esquema, datos, usuarios con sus contraseñas, IDs de perfil (y por tanto los enlaces de referido `?ref=`), códigos de pedido, SKU.

**Hay que rehacer a mano**: secretos, proveedor Google OAuth, webhooks externos, job de `pg_cron`, y las URLs embebidas en el trigger de notificaciones y en `integrations`.

**Ojo**: si el dominio publicado cambia, los enlaces de funnel ya compartidos por impulsadores y los anuncios activos de Meta apuntarán al viejo. Mantén el dominio personalizado apuntando al despliegue nuevo, o deja este proyecto vivo redirigiendo mientras rotas las campañas.
