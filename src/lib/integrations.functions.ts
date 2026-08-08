import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  orderId: z.string().uuid(),
});

type OrderEvent = "order.created" | "order.updated" | "order.deleted";

const eventSchema = z.object({
  orderId: z.string().uuid(),
  event: z.enum(["order.created", "order.updated", "order.deleted"]),
});

/**
 * Build a normalized payload for a HiveCore order to send to external
 * integrations (A&O CORE OS, etc.). Returns null if the order does not
 * exist (already deleted for example).
 */
async function buildOrderPayload(
  supabaseAdmin: any,
  orderId: string,
  event: OrderEvent,
) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  let productName = "";
  let productSku = "";
  let productSource: "hivecore" | "luxury" = "hivecore";
  let unitPrice: number | null = null;
  let suggestedRetailPrice: number | null = null;
  let impulsadorPrice: number | null = null;
  let authoritativeTotal: number | null = null;
  const orderQty = Number((order as any).quantity ?? 1) || 1;

  if ((order as any).product_id) {
    const { data: p } = await supabaseAdmin
      .from("products")
      .select("name, sku, price, bundle_pricing_enabled, price_2, price_3")
      .eq("id", (order as any).product_id)
      .maybeSingle();
    productName = p?.name ?? "";
    productSku = p?.sku ?? "";
    if (p?.price != null) {
      const { bundleTotal } = await import("./pricing");
      authoritativeTotal = bundleTotal(
        {
          price: Number(p.price),
          bundle_pricing_enabled: p.bundle_pricing_enabled,
          price_2: p.price_2,
          price_3: p.price_3,
        },
        orderQty,
      );
      unitPrice = Math.round((authoritativeTotal / orderQty) * 100) / 100;
    }
  } else if ((order as any).luxury_product_id) {
    productSource = "luxury";
    const { data: p } = await supabaseAdmin
      .from("luxury_products")
      .select("name, sku, price, suggested_retail_price")
      .eq("id", (order as any).luxury_product_id)
      .maybeSingle();
    productName = p?.name ?? "";
    productSku = p?.sku ?? "";
    if (p) {
      impulsadorPrice = p.price != null ? Number(p.price) : null;
      suggestedRetailPrice = p.suggested_retail_price != null ? Number(p.suggested_retail_price) : null;
      // Authoritative selling price: retail if defined & > 0, else impulsador price.
      unitPrice =
        suggestedRetailPrice && suggestedRetailPrice > 0
          ? suggestedRetailPrice
          : impulsadorPrice ?? null;
      if (unitPrice != null) {
        authoritativeTotal = unitPrice * orderQty;
      }
    }
  }

  let impulsadorName: string | null = null;
  let impulsadorPhone: string | null = null;
  let impulsadorEmail: string | null = null;
  const impulsadorId = (order as any).impulsador_id as string | null;
  if (impulsadorId) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", impulsadorId)
      .maybeSingle();
    impulsadorName = prof?.full_name ?? null;
    impulsadorPhone = prof?.phone ?? null;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(impulsadorId);
      impulsadorEmail = u?.user?.email ?? null;
    } catch (e) {
      console.warn("[integrations.forward] getUserById", e);
    }
  }

  // If the DB total differs from the recomputed authoritative total (client
  // could have inserted with the wrong unit price, or the row predates a
  // pricing fix), self-heal the orders row so both HiveCore and A&O CORE OS
  // stay in sync with the source of truth (the product table).
  const dbTotal = Number((order as any).total ?? 0);
  if (
    authoritativeTotal != null &&
    Math.abs(authoritativeTotal - dbTotal) > 0.009 &&
    event !== "order.deleted"
  ) {
    await supabaseAdmin
      .from("orders")
      .update({ total: authoritativeTotal } as never)
      .eq("id", orderId);
    (order as any).total = authoritativeTotal;
  }

  const finalTotal = authoritativeTotal ?? dbTotal;
  const utility =
    productSource === "luxury" && unitPrice != null && impulsadorPrice != null
      ? Math.max(0, (unitPrice - impulsadorPrice) * orderQty)
      : null;

  return {
    payload: {
      source: "hivecore",
      event,
      order: {
        id: (order as any).id,
        code: (order as any).order_code,
        client_name: (order as any).client_name,
        client_phone: (order as any).client_phone,
        client_address: (order as any).client_address,
        quantity: orderQty,
        total: finalTotal,
        unit_price: unitPrice,
        suggested_retail_price: suggestedRetailPrice,
        impulsador_price: impulsadorPrice,
        utility,
        notes: (order as any).notes,
        status: (order as any).status,
        source: (order as any).source ?? "impulsador",
        payment_method: (order as any).payment_method ?? "cod",
        payment_status: (order as any).payment_status ?? "pending",
        payment_provider: (order as any).payment_provider ?? null,
        payment_transaction_id: (order as any).payment_transaction_id ?? null,
        paid_at: (order as any).paid_at ?? null,
        created_at: (order as any).created_at,
        external_ref: (order as any).external_ref ?? null,
      },
      product: {
        source: productSource,
        name: productName,
        sku: productSku,
        unit_price: unitPrice,
        suggested_retail_price: suggestedRetailPrice,
        impulsador_price: impulsadorPrice,
      },
      impulsador: {
        id: impulsadorId,
        name: impulsadorName,
        email: impulsadorEmail,
        phone: impulsadorPhone,
      },
    },
    order,
  };
}


/**
 * Send a payload to every active integration. Updates sync columns on the
 * order (unless the event is `order.deleted`, in which case the row is gone).
 */
async function dispatchToIntegrations(
  supabaseAdmin: any,
  orderId: string,
  event: OrderEvent,
  payload: Record<string, unknown>,
) {
  const { data: integrations, error: integErr } = await supabaseAdmin
    .from("integrations")
    .select("id, name, api_key, webhook_url, orders_sent")
    .eq("is_active", true);
  if (integErr) {
    console.error("[integrations.forward] load", integErr);
    return { forwarded: 0, total: 0, error: "load_failed" as string | null };
  }
  if (!integrations || integrations.length === 0) {
    return { forwarded: 0, total: 0, error: null };
  }

  let forwarded = 0;
  let lastRef: string | null = null;
  let lastErr: string | null = null;

  for (const integ of integrations) {
    try {
      const res = await fetch(integ.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${integ.api_key}`,
          "X-HiveCore-Integration": integ.id,
          "X-HiveCore-Event": event,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => "");
      if (res.ok) {
        forwarded += 1;
        try {
          const j = text ? JSON.parse(text) : null;
          lastRef = j?.id ?? j?.ref ?? j?.order_id ?? lastRef;
        } catch { /* ignore */ }
        await supabaseAdmin
          .from("integrations")
          .update({
            orders_sent: (integ.orders_sent ?? 0) + 1,
            last_sent_at: new Date().toISOString(),
            last_status: `${event} ok ${res.status}`,
            last_error: null,
          })
          .eq("id", integ.id);
      } else {
        lastErr = `HTTP ${res.status}: ${text.slice(0, 300)}`;
        await supabaseAdmin
          .from("integrations")
          .update({
            last_sent_at: new Date().toISOString(),
            last_status: `${event} error ${res.status}`,
            last_error: lastErr,
          })
          .eq("id", integ.id);
      }
    } catch (e: any) {
      lastErr = e?.message ?? String(e);
      await supabaseAdmin
        .from("integrations")
        .update({
          last_sent_at: new Date().toISOString(),
          last_status: `${event} error network`,
          last_error: lastErr,
        })
        .eq("id", integ.id);
    }
  }

  if (event !== "order.deleted") {
    await supabaseAdmin
      .from("orders")
      .update({
        external_synced_at: forwarded > 0 ? new Date().toISOString() : null,
        external_ref: lastRef,
        external_error: forwarded > 0 ? null : lastErr,
      } as never)
      .eq("id", orderId);
  }

  return { forwarded, total: integrations.length, error: lastErr };
}

/**
 * Fire-and-forget forwarding of a newly created HiveCore order. Kept for
 * backward compat with existing call sites (product/luxury pages).
 */
export const forwardOrderToIntegrations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const built = await buildOrderPayload(supabaseAdmin, data.orderId, "order.created");
    if (!built) return { forwarded: 0, total: 0, error: "order_not_found" };
    return dispatchToIntegrations(supabaseAdmin, data.orderId, "order.created", built.payload);
  });

/**
 * Generic event forwarder. Use for `order.updated` (status / client edits)
 * and `order.deleted`. For deletion, call this BEFORE deleting the row —
 * we need to build the payload from the current DB state, then the caller
 * (or this fn) removes the row.
 *
 * When called with `order.deleted`, this function also deletes the row
 * itself after successfully building and dispatching the payload, so the
 * client only needs to call this one function.
 */
export const forwardOrderEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const built = await buildOrderPayload(supabaseAdmin, data.orderId, data.event);
    if (!built) return { forwarded: 0, total: 0, error: "order_not_found" };

    const result = await dispatchToIntegrations(
      supabaseAdmin,
      data.orderId,
      data.event,
      built.payload,
    );

    if (data.event === "order.deleted") {
      const { error } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", data.orderId);
      if (error) {
        console.error("[integrations.forward] delete order", error);
        return { ...result, error: error.message };
      }
    }

    return result;
  });

/**
 * Send a synthetic test payload to a single integration, without touching orders.
 * Called from the admin panel's "Probar conexión" button.
 */
export const testIntegration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ integrationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integ, error } = await supabaseAdmin
      .from("integrations")
      .select("id, api_key, webhook_url")
      .eq("id", data.integrationId)
      .single();
    if (error || !integ) return { ok: false, status: 0, message: "Integración no encontrada" };

    const payload = {
      source: "hivecore",
      event: "integration.test",
      test: true,
      timestamp: new Date().toISOString(),
      order: {
        code: "TEST-0000",
        client_name: "Cliente de prueba",
        client_phone: "+000000000",
        quantity: 1,
        total: 0,
      },
      product: { source: "hivecore", name: "Producto de prueba", sku: "TEST-SKU" },
      impulsador: { id: null, name: "Impulsador de prueba", email: "test@ayoecosystem.com", phone: null },
    };

    try {
      const res = await fetch(integ.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${integ.api_key}`,
          "X-HiveCore-Event": "integration.test",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => "");
      const status = res.status;
      const message = text.slice(0, 500);
      await supabaseAdmin
        .from("integrations")
        .update({
          last_sent_at: new Date().toISOString(),
          last_status: res.ok ? `test ok ${status}` : `test error ${status}`,
          last_error: res.ok ? null : `HTTP ${status}: ${message}`,
        })
        .eq("id", integ.id);
      return { ok: res.ok, status, message };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await supabaseAdmin
        .from("integrations")
        .update({
          last_sent_at: new Date().toISOString(),
          last_status: "test error network",
          last_error: msg,
        })
        .eq("id", integ.id);
      return { ok: false, status: 0, message: msg };
    }
  });
