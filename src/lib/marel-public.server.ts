import { ANMA_WHATSAPP, waHref } from "@/lib/whatsapp";

export interface PublicTurn {
  role: "user" | "assistant";
  content: string;
}

/** Catálogo público (funnels + luxury) en texto para el contexto de Marel. */
export async function buildPublicCatalog() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: funnels }, { data: luxury }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("name, slug, price, short_description, sku")
      .eq("is_active", true)
      .limit(120),
    supabaseAdmin
      .from("luxury_products")
      .select("name, slug, suggested_retail_price, sku, stock_status, short_description")
      .eq("is_active", true)
      .limit(150),
  ]);

  const funnelList = (funnels ?? [])
    .map(
      (p) =>
        `- ${p.name} (SKU ${p.sku ?? "-"}) · $${Number(p.price ?? 0).toLocaleString("es-CO")} COP · /product/${p.slug}${p.short_description ? ` · ${p.short_description}` : ""}`,
    )
    .join("\n");

  const luxuryList = (luxury ?? [])
    .map(
      (p) =>
        `- ${p.name} (SKU ${p.sku ?? "-"}) · $${Number(p.suggested_retail_price ?? 0).toLocaleString("es-CO")} COP · /catalogo/${p.slug} · stock ${p.stock_status}${p.short_description ? ` · ${p.short_description}` : ""}`,
    )
    .join("\n");

  return { funnelList, luxuryList };
}

/** Teléfono de atención: el impulsador del enlace o el número oficial AnMa. */
export async function resolveHandoff(ref?: string | null) {
  if (ref) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, status")
      .eq("id", ref)
      .eq("status", "approved")
      .maybeSingle();
    if (data?.phone) {
      return { name: data.full_name ?? "tu asesor", phone: data.phone };
    }
  }
  return { name: "AnMa Luxury", phone: ANMA_WHATSAPP };
}

export function publicSystemPrompt(opts: {
  funnelList: string;
  luxuryList: string;
  advisorName: string;
}) {
  return `Eres **Marel**, la asesora virtual de AnMa Luxury Collection (ecosistema A&O / HIVECORE). Hablas español colombiano, cálida, breve y concreta. Markdown ligero. Nunca inventas productos ni precios.

## Reglas
- Precios siempre en pesos colombianos con el formato $ 000.000 COP.
- Solo puedes hablar de los productos listados abajo. Si no está, dilo con honestidad y ofrece alternativas del listado.
- El cliente puede pagar en línea o contra entrega.
- Cuando la persona quiera **comprar, reservar, pagar, saber envío o ya eligió un producto**, cierra tu respuesta invitándola a continuar por WhatsApp con ${opts.advisorName} y añade exactamente la línea:
  [HANDOFF]
- Si solo está explorando, no agregues [HANDOFF].

## Catálogo AnMa Luxury
${opts.luxuryList || "(sin piezas activas)"}

## Otros productos disponibles
${opts.funnelList || "(sin productos activos)"}`;
}

const MODEL = "google/gemini-2.5-flash";

export async function askMarelPublic(system: string, turns: PublicTurn[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Marel no está disponible en este momento.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...turns.slice(-12)],
    }),
  });

  if (res.status === 429) throw new Error("Marel está muy solicitada. Intenta en un momento.");
  if (!res.ok) {
    console.error("[marel-public] gateway error", res.status, await res.text());
    throw new Error("Marel no pudo responder ahora mismo.");
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "No pude generar una respuesta.";
}

export function buildWhatsAppLink(phone: string, lastUserMessage: string) {
  const text = `Hola 😊 Estaba conversando con Marel en el catálogo AnMa Luxury ✨. Me interesa: ${lastUserMessage.slice(0, 220)}`;
  return waHref(phone, text);
}
