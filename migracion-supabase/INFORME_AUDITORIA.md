# Informe de auditoría de migración — HIVECORE

Fecha de ejecución: 2026-08-26 · Alcance: FASE 1 completa + saneamiento del paquete de migración.

## 0. BLOQUEO DE PLATAFORMA (lectura obligatoria)

**No existe ningún proyecto Supabase externo conectado a este proyecto.**

Verificación real ejecutada:

| Comprobación | Resultado |
| --- | --- |
| Proyectos Supabase vinculados | 1 (uno solo) |
| Project ID | `bvzzqbharriukyrgondu` |
| `supabase/config.toml` → `project_id` | `bvzzqbharriukyrgondu` |
| `.env` → `VITE_SUPABASE_PROJECT_ID` | `bvzzqbharriukyrgondu` |
| Conexión `psql` (PGHOST) | pooler del **mismo** proyecto |
| Gestionado por Lovable | **sí** |
| Pausado | no (activo, PostgreSQL 17.6) |

Consecuencia directa: el "destino" `hivecore` no es alcanzable desde este entorno.
Cualquier SQL que ejecute aquí se aplica **al origen**, no a un destino. Por eso:

- **FASE 2 (aplicar esquema al destino): NO EJECUTADA** — no hay destino donde aplicarlo.
- **FASE 3 (datos): NO EJECUTADA** — mover datos "al destino" sería reescribir el origen.
- **FASE 4 (auth/storage al destino): NO EJECUTADA.**
- **FASE 5/6 contra el destino: NO EJECUTADAS.**

No se simuló ninguna de estas fases. Lo que **sí** se ejecutó: la auditoría real del
origen (abajo) y el saneamiento del paquete de migración, incluyendo la eliminación de
un secreto real que estaba versionado.

Para desbloquear hace falta una acción tuya en la plataforma (ver `CUTOVER.md`, paso 0):
conectar el proyecto Supabase propio mediante la integración de Supabase de Lovable.
El vínculo al backend gestionado no se puede reapuntar desde el chat.

## 1. Hallazgo de seguridad — secreto comprometido

`supabase/migrations/20260811214925_*.sql` y `migracion-supabase/00_schema_completo.sql`
contenían **en texto plano** el valor real de `order_notify_secret`
(`vault.create_secret('dd9d…f6b2a', 'order_notify_secret')`).

Acción aplicada ahora:

- Valor reemplazado por `__REDACTED_ROTAR_ESTE_SECRETO__` en la migración histórica.
- Valor reemplazado por `__REEMPLAZAR_ORDER_NOTIFY_SECRET__` en el consolidado.
- URL fija `https://project--77c6…lovable.app/...` reemplazada por
  `__REEMPLAZAR_APP_BASE_URL__` en el consolidado.

**Pendiente tuyo (no puedo hacerlo yo sin romper producción):** este secreto debe
considerarse comprometido y **rotarse**, tanto en `vault.secrets` como en el secret
`ORDER_NOTIFY_SECRET` del backend. Hasta rotarlo, cualquiera con acceso al historial del
repo puede firmar notificaciones de pedido.

No se encontraron otros valores reales de credenciales en artefactos versionados
(Wompi, Meta, Telegram, AOCORE y service_role solo aparecen como *nombres* de variable).

## 2. Auditoría del paquete de migración

| Elemento | Estado antes | Acción |
| --- | --- | --- |
| `00_schema_completo.sql` | 2 247 líneas, **el bloque `email_infra` estaba repetido 4 veces** (891 líneas duplicadas byte a byte) | Deduplicado a 1 356 líneas; los 4 archivos originales eran idempotentes, se conserva 1 ejecución |
| Secreto en claro | presente | redactado (ver §1) |
| URL de Lovable Cloud en trigger `orders_notify_new` | fija al dominio actual | parametrizada |
| Cobertura vs. las 29 migraciones | las 29 están representadas, en orden cronológico por cabecera | verificado por cabeceras de archivo |
| `01_verificacion.sql` | consulta tablas, RLS, políticas y grants | complementado con `04_matriz_verificacion.sql` |

### Sentencias que apuntan al entorno actual (requieren reescritura en el destino)

1. `orders_notify_new()` → `net.http_post` al dominio de la app (parametrizado).
2. `email_queue_dispatch()` → `net.http_post` con `service_role` leída de `vault`
   (`email_queue_service_role_key`): el vault **no viaja**, hay que recrear el secreto.
3. `pg_cron` job del wake de la cola de correo: los jobs de cron viven fuera del esquema
   `public` y **no** están en el dump; deben recrearse a mano en el destino.
4. Rutas de Storage: los objetos referencian el host del proyecto actual en las URLs
   guardadas en columnas de imagen/media.

## 3. Inventario real del ORIGEN (medido, no estimado)

| Componente | Valor |
| --- | --- |
| Tablas base en `public` | 17 |
| Tablas **sin** RLS | 0 (todas con RLS activo) |
| Políticas RLS | 34 |
| Enums | `app_role`, `user_status`, `order_status`, `impulsor_level` |
| Funciones en `public` | 17 (11 `SECURITY DEFINER`) |
| Triggers no internos | 14 |
| Extensiones | `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `pgmq`, `plpgsql`, `supabase_vault`, `uuid-ossp` |
| Buckets de Storage | `product-images` (público) |
| Objetos en Storage | 747 |
| Filas: `profiles` / `products` / `luxury_products` / `orders` | 12 / 44 / 30 / 5 |

Tablas: `categories`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`,
`integrations`, `luxury_brands`, `luxury_categories`, `luxury_products`, `luxury_promos`,
`marel_messages`, `marel_threads`, `notification_settings`, `orders`, `products`,
`profiles`, `suppressed_emails`, `user_roles`.

Funciones `SECURITY DEFINER`: `delete_email`, `email_queue_dispatch`, `email_queue_wake`,
`enqueue_email`, `handle_new_user`, `has_role`, `is_approved`, `move_to_dlq`,
`orders_notify_new`, `profiles_guard_level`, `read_email_batch`.

Limitaciones de la auditoría (rol restringido de este entorno, no fallo de configuración):
`auth.users` y `cron.job` no son legibles desde aquí (`permission denied`). El conteo de
usuarios auth conocido de verificaciones anteriores es **12** (10 con correo confirmado),
pero no lo pude reconfirmar en esta ejecución.

## 4. Auth — advertencia explícita

Migrar `auth.users` conservando IDs **y** contraseñas solo es posible con la exportación
oficial de usuarios de Supabase (incluye `encrypted_password`), que requiere acceso
service_role/dashboard del proyecto de origen. Desde aquí ese acceso no está disponible.
**No afirmo, ni afirmaré, que las contraseñas se conserven** hasta que exista evidencia de
una exportación real de `auth.users` con los hashes incluidos. La alternativa sin evidencia
es invitar/resetear contraseñas, lo que sí cambia la experiencia de los 12 usuarios.

## 5. Matriz de estado

| COMPONENTE | ORIGEN | DESTINO | ESTADO | DIFERENCIAS | ACCIÓN PENDIENTE |
| --- | --- | --- | --- | --- | --- |
| Proyecto Supabase | `bvzzqbharriukyrgondu` (gestionado) | no conectado | **BLOQUEADO** | no hay destino | Conectar proyecto propio (paso 0 de `CUTOVER.md`) |
| Esquema (17 tablas) | activo | — | pendiente | — | Ejecutar `00_schema_completo.sql` |
| RLS + 34 políticas | activo | — | pendiente | — | Incluido en el consolidado |
| 17 funciones / 14 triggers | activo | — | pendiente | — | Incluido en el consolidado |
| Extensiones | 8 | — | pendiente | `pgmq`/`pg_cron` requieren plan que las soporte | Verificar disponibilidad antes de aplicar |
| Datos (91 filas críticas + logs) | medido | — | pendiente | — | `02_export_datos.sh` → `03_import_datos.md` |
| `auth.users` (12) | activo | — | pendiente | contraseñas sin garantía | Exportación oficial de usuarios |
| Storage `product-images` (747) | activo | — | pendiente | host distinto | Recrear bucket + copiar objetos |
| `vault` (order_notify, email key) | activo | — | pendiente | secretos no viajan | Recrear y **rotar** |
| `pg_cron` jobs | activo | — | pendiente | no van en el dump | Recrear a mano |
| Wompi / Meta CAPI / Telegram / AOCORE | operativos en origen | — | intacto (por diseño) | — | Reapuntar solo en el cutover |

## 6. Respuestas directas

1. **Qué migré realmente:** nada de datos ni esquema hacia un destino — no existe destino conectado. Sí saneé el paquete de migración (dedupe de 891 líneas, secreto redactado, URL parametrizada) y generé los scripts de export/import y la matriz de verificación.
2. **Qué verifiqué realmente:** identidad y estado del backend conectado, capacidad de ejecutar SQL, inventario completo del origen (tablas, RLS, políticas, funciones, triggers, extensiones, enums, buckets, objetos, conteos), cobertura del consolidado frente a las 29 migraciones y presencia de secretos/URLs acopladas al entorno actual.
3. **Qué quedó funcionando:** el origen, intacto y operativo. Ningún cambio destructivo.
4. **Diferencias origen/destino:** el destino no existe todavía; la matriz de §5 es la lista completa de lo que habrá que igualar.
5. **Secretos/integraciones con intervención manual:** rotación de `order_notify_secret` (comprometido), `email_queue_service_role_key` en vault, Wompi (4 claves), Meta CAPI + Pixel, Telegram, `AOCORE_INBOUND_SECRET`, `LOVABLE_API_KEY` para Marel, y los redirects de OAuth.
6. **Qué falta para el cutover:** todo lo listado en `CUTOVER.md`; el primer bloqueante es conectar el proyecto Supabase propio.
7. **¿El destino está listo para ser backend principal?** **No.** No hay destino aún.
