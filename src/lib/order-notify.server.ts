import { formatCOP } from "./pricing";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export type OrderAlert = {
  orderCode: string;
  productName: string;
  quantity: number;
  total: number;
  seller: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string | null;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
};

export async function loadOrderAlert(orderId: string): Promise<OrderAlert | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      "order_code, quantity, total, client_name, client_phone, client_address, client_city, client_region, source, impulsador_id, product_id, luxury_product_id, payment_method, payment_status, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return null;

  let productName = "Producto";
  if (order.product_id) {
    const { data } = await supabaseAdmin
      .from("products")
      .select("name")
      .eq("id", order.product_id)
      .maybeSingle();
    if (data?.name) productName = data.name;
  } else if (order.luxury_product_id) {
    const { data } = await supabaseAdmin
      .from("luxury_products")
      .select("name")
      .eq("id", order.luxury_product_id)
      .maybeSingle();
    if (data?.name) productName = data.name;
  }

  let seller = "Tráfico pago (Meta Ads)";
  if (order.impulsador_id) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", order.impulsador_id)
      .maybeSingle();
    let email = "";
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.impulsador_id);
      email = authUser?.user?.email ?? "";
    } catch {
      /* opcional */
    }
    seller = prof?.full_name?.trim() || email || "Impulsador";
    if (prof?.full_name && email) seller = `${prof.full_name} (${email})`;
  }

  return {
    orderCode: order.order_code,
    productName,
    quantity: Number(order.quantity ?? 1),
    total: Number(order.total ?? 0),
    seller,
    clientName: order.client_name,
    clientPhone: order.client_phone,
    clientAddress:
      [order.client_address, (order as any).client_city, (order as any).client_region]
        .filter((v) => typeof v === "string" && v.trim())
        .join(" · ") || null,

    paymentMethod: order.payment_method === "online" ? "Pago en línea" : "Contra entrega",
    paymentStatus: order.payment_status ?? "pending",
    createdAt: order.created_at,
  };
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function alertTelegramText(a: OrderAlert) {
  return [
    "🛒 <b>NUEVO PEDIDO</b>",
    "",
    `🧾 Código: <b>${esc(a.orderCode)}</b>`,
    `📦 Producto: <b>${esc(a.productName)}</b>`,
    `🔢 Unidades: <b>${a.quantity}</b>`,
    `💰 Total: <b>${formatCOP(a.total)}</b>`,
    `🙋 Vendedor: <b>${esc(a.seller)}</b>`,
    `💳 Pago: ${esc(a.paymentMethod)} (${esc(a.paymentStatus)})`,
    "",
    `👤 Cliente: ${esc(a.clientName)}`,
    `📞 Teléfono: ${esc(a.clientPhone)}`,
    a.clientAddress ? `📍 Dirección: ${esc(a.clientAddress)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function alertEmailHtml(a: OrderAlert) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px;background:#f5f5f5;"><b>${k}</b></td><td style="padding:8px;">${esc(v)}</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;">
    <h2 style="margin:0 0 12px;">🛒 Nuevo pedido ${esc(a.orderCode)}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${row("Producto", a.productName)}
      ${row("Unidades", String(a.quantity))}
      ${row("Total", formatCOP(a.total))}
      ${row("Vendedor", a.seller)}
      ${row("Pago", `${a.paymentMethod} (${a.paymentStatus})`)}
      ${row("Cliente", a.clientName)}
      ${row("Teléfono", a.clientPhone)}
      ${row("Dirección", a.clientAddress ?? "—")}
    </table>
  </div>`;
}

export function alertEmailText(a: OrderAlert) {
  return `Nuevo pedido ${a.orderCode}
Producto: ${a.productName}
Unidades: ${a.quantity}
Total: ${formatCOP(a.total)}
Vendedor: ${a.seller}
Pago: ${a.paymentMethod} (${a.paymentStatus})
Cliente: ${a.clientName} · ${a.clientPhone}
Dirección: ${a.clientAddress ?? "—"}`;
}

export async function sendTelegramAlert(chatId: string, text: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  if (!lovableKey || !telegramKey) return { ok: false, error: "telegram_not_configured" };

  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[order-notify] telegram failed [${res.status}]: ${body}`);
    return { ok: false, error: `telegram_${res.status}: ${body.slice(0, 300)}` };
  }
  try {
    const json = JSON.parse(body);
    if (json?.ok === false) {
      console.error("[order-notify] telegram error", json);
      return { ok: false, error: String(json.description ?? "telegram_error") };
    }
  } catch {
    /* ignore */
  }
  return { ok: true as const };
}

export async function sendEmailAlert(recipients: string[], subject: string, alert: OrderAlert) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || recipients.length === 0) return { ok: false, error: "email_not_configured" };

  const { sendLovableEmail } = await import("@lovable.dev/email-js");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const html = alertEmailHtml(alert);
  const text = alertEmailText(alert);
  let sent = 0;
  for (const to of recipients) {
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      await supabaseAdmin.from("email_unsubscribe_tokens").insert({ token, email: to } as never);
      await sendLovableEmail(
        {
          to,
          from: "HIVECORE <pedidos@notify.ayoecosystem.com>",
          sender_domain: "notify.ayoecosystem.com",
          subject,
          html,
          text,
          purpose: "transactional",
          label: "new_order_alert",
          unsubscribe_token: token,
          message_id: `order-alert-${alert.orderCode}-${to}`,
          idempotency_key: `order-alert-${alert.orderCode}-${to}`,
        },
        { apiKey },
      );
      sent++;
    } catch (e) {
      console.error("[order-notify] email failed", to, e);
    }
  }
  return { ok: sent > 0, sent };
}

export async function dispatchOrderAlert(alert: OrderAlert) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin
    .from("notification_settings")
    .select("telegram_enabled, telegram_chat_id, email_enabled, notify_emails")
    .eq("id", 1)
    .maybeSingle();

  const results: Record<string, { ok: boolean; error?: string; sent?: number }> = {};

  if (settings?.telegram_enabled && settings.telegram_chat_id) {
    results["telegram"] = await sendTelegramAlert(
      settings.telegram_chat_id,
      alertTelegramText(alert),
    );
  } else {
    results["telegram"] = { ok: false, error: "disabled_or_no_chat_id" };
  }

  const emails = (settings?.notify_emails ?? []).filter((e: string) => Boolean(e?.trim()));
  if (settings?.email_enabled && emails.length > 0) {
    results["email"] = await sendEmailAlert(
      emails,
      `🛒 Nuevo pedido ${alert.orderCode} · ${alert.productName}`,
      alert,
    );
  } else {
    results["email"] = { ok: false, error: "disabled_or_no_recipients" };
  }

  return results;
}
