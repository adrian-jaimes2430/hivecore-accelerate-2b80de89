import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Fire-and-forget forwarding of a HIVECORE order to every active
 * external integration (A&O CORE OS, etc.). Called from the client
 * right after `orders.insert(...)` succeeds.
 *
 * Uses the service-role admin client because ordinary impulsadores
 * cannot read `integrations` or update sync columns on `orders`.
 */
export const forwardOrderToIntegrations = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load active integrations
    const { data: integrations, error: integErr } = await supabaseAdmin
      .from("integrations")
      .select("id, name, api_key, webhook_url, orders_sent")
      .eq("is_active", true);
    if (integErr) {
      console.error("[integrations.forward] load", integErr);
      return { forwarded: 0, reason: "load_failed" };
    }
    if (!integrations || integrations.length === 0) {
      return { forwarded: 0, reason: "no_active_integrations" };
    }

    // Load order + related product + impulsador profile
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) {
      console.error("[integrations.forward] order", orderErr);
      return { forwarded: 0, reason: "order_not_found" };
    }

    // Product may be from `products` or `luxury_products`
    let productName = "";
    let productSku = "";
    let productSource: "hivecore" | "luxury" = "hivecore";
    if ((order as any).product_id) {
      const { data: p } = await supabaseAdmin
        .from("products")
        .select("name, sku")
        .eq("id", (order as any).product_id)
        .maybeSingle();
      productName = p?.name ?? "";
      productSku = p?.sku ?? "";
    } else if ((order as any).luxury_product_id) {
      productSource = "luxury";
      const { data: p } = await supabaseAdmin
        .from("luxury_products")
        .select("name, sku")
        .eq("id", (order as any).luxury_product_id)
        .maybeSingle();
      productName = p?.name ?? "";
      productSku = p?.sku ?? "";
    }

    // Impulsador profile + email
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

    const payload = {
      source: "hivecore",
      event: "order.created",
      order: {
        id: (order as any).id,
        code: (order as any).order_code,
        client_name: (order as any).client_name,
        client_phone: (order as any).client_phone,
        client_address: (order as any).client_address,
        quantity: (order as any).quantity,
        total: (order as any).total,
        notes: (order as any).notes,
        status: (order as any).status,
        created_at: (order as any).created_at,
      },
      product: {
        source: productSource,
        name: productName,
        sku: productSku,
      },
      impulsador: {
        id: impulsadorId,
        name: impulsadorName,
        email: impulsadorEmail,
        phone: impulsadorPhone,
      },
    };

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
            "X-HiveCore-Event": "order.created",
          },
          body: JSON.stringify(payload),
        });
        const text = await res.text().catch(() => "");
        if (res.ok) {
          forwarded += 1;
          // Try to extract an external reference from the response
          try {
            const j = text ? JSON.parse(text) : null;
            lastRef = j?.id ?? j?.ref ?? j?.order_id ?? null;
          } catch { /* ignore */ }
          await supabaseAdmin
            .from("integrations")
            .update({
              orders_sent: (integ.orders_sent ?? 0) + 1,
              last_sent_at: new Date().toISOString(),
              last_status: `ok ${res.status}`,
              last_error: null,
            })
            .eq("id", integ.id);
        } else {
          lastErr = `HTTP ${res.status}: ${text.slice(0, 300)}`;
          await supabaseAdmin
            .from("integrations")
            .update({
              last_sent_at: new Date().toISOString(),
              last_status: `error ${res.status}`,
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
            last_status: "error network",
            last_error: lastErr,
          })
          .eq("id", integ.id);
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({
        external_synced_at: forwarded > 0 ? new Date().toISOString() : null,
        external_ref: lastRef,
        external_error: forwarded > 0 ? null : lastErr,
      } as never)
      .eq("id", data.orderId);

    return { forwarded, total: integrations.length, error: lastErr };
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
