import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { atLeast, LEVEL_GATES, LEVEL_LABEL, type ImpulsorLevel } from "@/lib/levels";

export type MarelRole = "user" | "assistant";
export interface MarelTurn {
  role: MarelRole;
  content: string;
}

const COMMISSION = 0.2;
const MODEL = "google/gemini-3.7-flash";

/** Builds the real catalog context Marel reasons about, respecting the user's level. */
export async function buildCatalogContext(
  supabase: SupabaseClient<Database>,
  level: ImpulsorLevel,
  isStaff: boolean,
) {
  const canLuxury = isStaff || atLeast(level, LEVEL_GATES.luxury);

  const [{ data: products }, { data: luxury }] = await Promise.all([
    supabase
      .from("products")
      .select("name, slug, price, price_2, price_3, short_description, sku, is_active")
      .eq("is_active", true)
      .limit(120),
    canLuxury
      ? supabase
          .from("luxury_products")
          .select("name, slug, suggested_retail_price, price, sku, stock_status, is_active")
          .eq("is_active", true)
          .limit(120)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const funnels = (products ?? [])
    .map((p) => {
      const commission = Math.round(Number(p.price ?? 0) * COMMISSION);
      return `- ${p.name} (SKU ${p.sku ?? "-"}) · precio $${Number(p.price ?? 0).toLocaleString("es-CO")} COP · comisión estimada $${commission.toLocaleString("es-CO")} COP · link /product/${p.slug}${p.short_description ? ` · ${p.short_description}` : ""}`;
    })
    .sort()
    .join("\n");

  const luxuryList = (luxury ?? [])
    .map((p) => {
      const retail = Number((p as { suggested_retail_price?: number }).suggested_retail_price ?? 0);
      const commission = Math.round(retail * COMMISSION);
      return `- ${p.name} (SKU ${p.sku ?? "-"}) · precio sugerido $${retail.toLocaleString("es-CO")} COP · comisión estimada $${commission.toLocaleString("es-CO")} COP · link /luxury/${p.slug} · stock ${p.stock_status}`;
    })
    .join("\n");

  return { funnels, luxuryList, canLuxury };
}

export function buildSystemPrompt(opts: {
  name: string | null;
  level: ImpulsorLevel;
  isStaff: boolean;
  funnels: string;
  luxuryList: string;
  canLuxury: boolean;
}) {
  return `Eres **Marel**, la asistente interna de NomadHive / HIVECORE. Hablas español colombiano, cercana, breve y concreta. Usas markdown ligero (negritas y listas) y nunca inventas datos.

## Con quién hablas
- Nombre: ${opts.name ?? "impulsador"}
- Nivel: ${LEVEL_LABEL[opts.level]}${opts.isStaff ? " (equipo interno)" : ""}
- Acceso a AnMa Luxury: ${opts.canLuxury ? "sí" : "no (se desbloquea desde nivel Senior)"}

## Reglas
- Cada impulsador gana **20% del total de cada venta**. Calcula siempre así y muestra los valores en pesos colombianos ($ 000.000 COP).
- Niveles: 1. Junior · 2. Senior · 3. Líder · 4. Staff Matriz. Luxury se habilita desde Senior.
${opts.canLuxury ? "" : "- Esta persona es Junior: NO recomiendes ni menciones productos de AnMa Luxury como opción de venta; si pregunta, explica que se desbloquea al ascender a Senior.\n"}- Si te piden algo que no está en el catálogo, dilo con claridad en lugar de inventarlo.

## Qué sabes explicar
- Cómo funciona la plataforma: catálogo interno, funnels públicos, AnMa Luxury, pedidos.
- Proceso de impulso: eliges un producto, compartes tu link con referido (\`?ref=TU_ID\`) por WhatsApp o redes, el cliente compra en el funnel público y el pedido queda registrado a tu nombre en "Mis pedidos".
- Pagos: el cliente puede pagar en línea (Wompi) o contra entrega. El pedido pasa por pendiente → confirmado → enviado → entregado. Tu comisión del 20% se liquida sobre el total de los pedidos entregados.
- Encontrar los productos con mejor ganancia: ordena por comisión estimada y recomienda los primeros.

## Catálogo de funnels (activo)
${opts.funnels || "(sin productos activos)"}

${opts.canLuxury ? `## Catálogo AnMa Luxury (activo)\n${opts.luxuryList || "(sin productos activos)"}` : ""}`;
}

/** Calls the Lovable AI gateway and returns Marel's reply text. */
export async function askMarel(system: string, turns: MarelTurn[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Marel no está configurada (falta la llave de IA).");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...turns.slice(-16)],
    }),
  });

  if (res.status === 429) throw new Error("Marel está muy solicitada ahora mismo. Intenta en un momento.");
  if (res.status === 402) throw new Error("Se agotaron los créditos de IA del espacio de trabajo.");
  if (!res.ok) {
    const detail = await res.text();
    console.error("[marel] gateway error", res.status, detail);
    throw new Error("Marel no pudo responder en este momento.");
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta, intenta de nuevo.";
}

export function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "Nueva conversación";
}
