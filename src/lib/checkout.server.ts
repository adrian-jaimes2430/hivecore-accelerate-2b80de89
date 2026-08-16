import { z } from "zod";
import { bundleTotal } from "./pricing";
import { buildCheckoutUrl, getWompiConfig, guessCityFromAddress } from "./wompi.server";

export const publicOrderSchema = z.object({
  productKind: z.enum(["funnel", "luxury"]),
  slug: z.string().min(1),
  quantity: z.number().int().min(1).max(50).default(1),
  client_name: z.string().trim().min(2).max(120),
  client_phone: z.string().trim().min(6).max(30),
  client_email: z.string().trim().email().max(180),
  client_address: z.string().trim().min(4).max(300),
  client_city: z.string().trim().min(2).max(80),
  client_region: z.string().trim().min(2).max(80),


  notes: z.string().trim().max(1000).optional().nullable(),
  variations: z.string().trim().max(300).optional().nullable(),
  payment_method: z.enum(["cod", "online"]),
  ref: z.string().uuid().optional().nullable(),
  origin: z.string().trim().max(200).optional().nullable(),
  // Datos de atribución del navegador para la Conversions API de Meta
  fbp: z.string().trim().max(200).optional().nullable(),
  fbc: z.string().trim().max(400).optional().nullable(),
  event_source_url: z.string().trim().max(500).optional().nullable(),
  client_user_agent: z.string().trim().max(500).optional().nullable(),
});

export type PublicOrderInput = z.infer<typeof publicOrderSchema>;

const SITE_URL = "https://hivecore-accelerate.lovable.app";

/** Orders coming from this account's public links are treated as paid traffic. */
const PAID_TRAFFIC_EMAILS = ["studio.ayosoluciones@gmail.com"];

export async function createPublicOrder(input: PublicOrderInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let productId: string | null = null;
  let luxuryProductId: string | null = null;
  let unitPrice = 0;
  let productName = "";
  let total = 0;

  if (input.productKind === "funnel") {
    const { data: p } = await supabaseAdmin
      .from("products")
      .select("id,name,price,bundle_pricing_enabled,price_2,price_3")
      .eq("slug", input.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!p) return { ok: false as const, error: "product_not_found" };
    productId = p.id;
    productName = p.name;
    unitPrice = Number(p.price ?? 0);
    total = bundleTotal(
      {
        price: unitPrice,
        bundle_pricing_enabled: p.bundle_pricing_enabled,
        price_2: p.price_2,
        price_3: p.price_3,
      },
      input.quantity,
    );
  } else {
    const { data: p } = await supabaseAdmin
      .from("luxury_products")
      .select("id,name,price,suggested_retail_price")
      .eq("slug", input.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!p) return { ok: false as const, error: "product_not_found" };
    luxuryProductId = p.id;
    productName = p.name;
    const retail = p.suggested_retail_price != null ? Number(p.suggested_retail_price) : 0;
    unitPrice = retail > 0 ? retail : Number(p.price ?? 0);
    total = Math.round(unitPrice * input.quantity * 100) / 100;
  }

  // Only accept a referral when the profile is an approved impulsador,
  // and the referring account is not one of the paid-traffic accounts.
  let impulsadorId: string | null = null;
  if (input.ref) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", input.ref)
      .eq("status", "approved")
      .maybeSingle();
    impulsadorId = prof?.id ?? null;

    if (impulsadorId) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(impulsadorId);
        const email = authUser?.user?.email?.toLowerCase() ?? "";
        if (PAID_TRAFFIC_EMAILS.includes(email)) impulsadorId = null;
      } catch (e) {
        console.warn("[checkout] paid-traffic check failed", e);
      }
    }
  }


  const isPaidTraffic = !impulsadorId;

  const noteParts = [
    isPaidTraffic ? "TRÁFICO PAGO · META ADS (funnel público)" : null,
    input.variations ? `Variaciones: ${input.variations}` : null,
    input.client_email ? `Email: ${input.client_email}` : null,
    input.origin ? `Origen: ${input.origin}` : null,
    input.notes || null,
  ].filter(Boolean);

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .insert({
      impulsador_id: impulsadorId,
      product_id: productId,
      luxury_product_id: luxuryProductId,
      client_name: input.client_name,
      client_phone: input.client_phone,
      client_address: input.client_address,
      client_city: input.client_city,
      client_region: input.client_region,
      client_email: input.client_email,

      quantity: input.quantity,
      notes: noteParts.join(" | ") || null,
      total,
      source: impulsadorId ? "impulsador" : "paid_traffic",
      payment_method: input.payment_method,
      payment_status: "pending",
      payment_provider: input.payment_method === "online" ? "wompi" : null,
      payment_amount: input.payment_method === "online" ? total : null,
    } as never)
    .select("id, order_code")
    .single();

  if (error || !order) {
    console.error("[checkout] insert order", error);
    return { ok: false as const, error: error?.message ?? "insert_failed" };
  }

  const reference = order.order_code;
  await supabaseAdmin
    .from("orders")
    .update({ payment_reference: reference } as never)
    .eq("id", order.id);

  if (input.payment_method === "cod") {
    await forwardSafely(order.id, "order.created");
    return {
      ok: true as const,
      orderId: order.id,
      orderCode: order.order_code,
      total,
      productName,
      checkoutUrl: null as string | null,
    };
  }


  const cfg = getWompiConfig();
  if (!cfg) {
    return {
      ok: false as const,
      error: "wompi_not_configured",
      orderCode: order.order_code,
    };
  }

  const city =
    input.client_city?.trim() || guessCityFromAddress(input.client_address) || null;

  const checkoutUrl = buildCheckoutUrl({
    cfg,
    reference,
    amountInCents: Math.round(total * 100),
    redirectUrl: `${SITE_URL}/gracias?ref=${encodeURIComponent(reference)}`,
    email: input.client_email ?? null,
    fullName: input.client_name,
    phone: input.client_phone.replace(/[^\d+]/g, ""),
    address: input.client_address,
    city,
    region: input.client_region?.trim() || city,
    country: "CO",
  });

  // Los pedidos con pago en línea también se envían a A&O CORE OS al crearse
  // (estado de pago "pending"); el webhook de Wompi enviará luego el update.
  await forwardSafely(order.id, "order.created");


  return {
    ok: true as const,
    orderId: order.id,
    orderCode: order.order_code,
    total,
    productName,
    checkoutUrl,
  };
}

export async function forwardSafely(orderId: string, event: "order.created" | "order.updated") {
  try {
    const { forwardOrderEvent } = await import("./integrations.functions");
    await forwardOrderEvent({ data: { orderId, event } });
  } catch (e) {
    console.warn("[checkout] forward failed", e);
  }
}

export async function getPublicOrderStatus(reference: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("order_code, client_name, quantity, total, status, payment_method, payment_status")
    .eq("order_code", reference)
    .maybeSingle();
  return data ?? null;
}
