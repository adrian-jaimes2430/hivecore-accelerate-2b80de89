import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const settingsSchema = z.object({
  telegram_enabled: z.boolean(),
  telegram_chat_id: z.string().trim().max(64).nullable(),
  email_enabled: z.boolean(),
  notify_emails: z.array(z.string().trim().email().max(180)).max(10),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: rows } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = (rows ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("super_admin") && !roles.includes("collaborator")) {
    throw new Error("Forbidden");
  }
}

export const getNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data } = await (context as any).supabase
      .from("notification_settings")
      .select("telegram_enabled, telegram_chat_id, email_enabled, notify_emails")
      .eq("id", 1)
      .maybeSingle();
    return (
      data ?? {
        telegram_enabled: true,
        telegram_chat_id: null,
        email_enabled: true,
        notify_emails: [],
      }
    );
  });

export const saveNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await (context as any).supabase
      .from("notification_settings")
      .upsert({ id: 1, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lee los últimos mensajes del bot de Telegram para detectar el chat_id del admin. */
export const detectTelegramChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const telegramKey = process.env["TELEGRAM_API_KEY"];
    if (!lovableKey || !telegramKey) return { ok: false as const, error: "telegram_not_configured" };

    const res = await fetch("https://connector-gateway.lovable.dev/telegram/getUpdates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": telegramKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 20 }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false as const, error: `telegram_${res.status}: ${text.slice(0, 200)}` };

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, error: "invalid_response" };
    }
    if (json?.ok === false) return { ok: false as const, error: String(json.description) };

    const chats: { id: string; name: string }[] = [];
    for (const u of json?.result ?? []) {
      const chat = u?.message?.chat ?? u?.edited_message?.chat;
      if (!chat?.id) continue;
      const id = String(chat.id);
      if (chats.some((c) => c.id === id)) continue;
      chats.push({
        id,
        name: [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.title || id,
      });
    }
    return { ok: true as const, chats };
  });

/** Envía un aviso de prueba con datos ficticios a los canales configurados. */
export const sendTestOrderAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { dispatchOrderAlert } = await import("@/lib/order-notify.server");
    const results = await dispatchOrderAlert({
      orderCode: `HC-PRUEBA-${Date.now().toString(36).toUpperCase()}`,
      productName: "Pedido de prueba HIVECORE",
      quantity: 2,
      total: 289900,
      seller: "Tráfico pago (Meta Ads)",
      clientName: "Cliente de prueba",
      clientPhone: "+57 320 483 6063",
      clientAddress: "Calle 1 # 2-3, Bogotá",
      paymentMethod: "Contra entrega",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    });
    return { ok: true, results };
  });
