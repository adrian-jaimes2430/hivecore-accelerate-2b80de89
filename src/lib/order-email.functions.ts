import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OPS_TO = "operaciones@ayoecosystem.com";
const OPS_CC = "ceo@ayoecosystem.com";

const inputSchema = z.object({
  orderCode: z.string().min(1).max(64),
  productName: z.string().min(1).max(255),
  productSku: z.string().min(1).max(64),
  clientName: z.string().min(1).max(255),
  clientPhone: z.string().min(1).max(64),
  clientAddress: z.string().max(500).optional().nullable(),
  quantity: z.number().int().min(1).max(9999),
  total: z.number().min(0).max(9_999_999),
  notes: z.string().max(2000).optional().nullable(),
  impulsadorName: z.string().max(255).optional().nullable(),
});

export const sendOrderNotification = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      console.warn("[order-email] Email no configurado. Saltando notificación.");
      return { sent: false, reason: "not_configured" };
    }

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

    const templateData = {
      orderCode: data.orderCode,
      productName: data.productName,
      productSku: data.productSku,
      quantity: data.quantity,
      total: `$ ${Math.round(data.total).toLocaleString("es-CO")} COP`,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress ?? "—",
      notes: data.notes ?? "—",
      impulsadorName: data.impulsadorName ?? "—",
    };

    let sent = 0;
    for (const to of [OPS_TO, OPS_CC]) {
      try {
        const result = await sendTemplateEmail("order-notification", to, {
          templateData,
          idempotencyKey: `order-notification-${data.orderCode}-${to}`,
        });
        if (result.sent) sent++;
        else console.warn("[order-email] destinatario suprimido", to);
      } catch (e) {
        console.error("[order-email] send failed", to, e instanceof Error ? e.message : e);
      }
    }

    return sent > 0 ? { sent: true } : { sent: false, reason: "send_failed" };
  });
