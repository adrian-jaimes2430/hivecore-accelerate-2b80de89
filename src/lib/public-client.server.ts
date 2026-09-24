import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Cliente público de solo lectura (llave publishable, RLS como anon).
 * Funciona en cualquier hosting: usa las variables de servidor cuando existen
 * y cae a las VITE_* que Vite incrusta en el build (así carga también en Vercel).
 * Solo para lecturas públicas del catálogo; nunca para datos de usuario ni escrituras.
 */
export function createPublicClient() {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env.VITE_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan las claves públicas del backend.");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
