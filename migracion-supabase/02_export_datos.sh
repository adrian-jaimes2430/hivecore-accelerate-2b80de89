#!/usr/bin/env bash
# Exporta los DATOS del origen a CSV. Operación 100% de lectura: no modifica nada.
#
# Uso (con las variables PG* del proyecto de ORIGEN ya presentes en el entorno):
#   bash migracion-supabase/02_export_datos.sh /ruta/de/salida
#
# NO exporta: auth.users (usa la exportación oficial de usuarios de Supabase),
# vault.secrets (secretos: se recrean a mano) ni storage.objects (se copian aparte).
set -euo pipefail

OUT="${1:-./export_hivecore}"
mkdir -p "$OUT"

# Orden de dependencias: padres primero. Respetar este orden también al importar.
TABLES=(
  categories
  profiles
  user_roles
  products
  orders
  luxury_categories
  luxury_brands
  luxury_products
  luxury_promos
  marel_threads
  marel_messages
  integrations
  notification_settings
  suppressed_emails
  email_send_state
  email_send_log
  email_unsubscribe_tokens
)

: > "$OUT/conteos_origen.txt"
for t in "${TABLES[@]}"; do
  echo "-> $t"
  psql -c "\copy (SELECT * FROM public.$t) TO '$OUT/$t.csv' WITH CSV HEADER"
  n=$(psql -tAc "SELECT count(*) FROM public.$t")
  printf '%-28s %s\n' "$t" "$n" >> "$OUT/conteos_origen.txt"
done

# Inventario de Storage (rutas exactas a preservar en el destino).
psql -c "\copy (SELECT bucket_id, name, metadata FROM storage.objects ORDER BY bucket_id, name) TO '$OUT/storage_objects.csv' WITH CSV HEADER"

echo
echo "Listo. Conteos del origen:"
cat "$OUT/conteos_origen.txt"
echo
echo "IMPORTANTE: 'integrations' puede contener claves de API en columnas de datos."
echo "Revisa ese CSV y NO lo subas al repositorio ni a ningún almacenamiento compartido."
