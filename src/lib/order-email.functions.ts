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
    const apiKey = process.env.LOVABLE_API_KEY;
    const senderDomain = process.env.LOVABLE_EMAIL_SENDER_DOMAIN;

    if (!apiKey || !senderDomain) {
      console.warn("[order-email] Email no configurado. Saltando notificación.");
      return { sent: false, reason: "not_configured" };
    }

    const subject = `Nuevo pedido ${data.orderCode} · ${data.productName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color:#111; max-width:600px; margin:0 auto;">
        <h2 style="margin:0 0 12px;">Nuevo pedido HIVECORE</h2>
        <p style="color:#444; margin:0 0 16px;">Se ha generado un nuevo pedido en el ecosistema A&O.</p>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Código</b></td><td style="padding:8px;">${data.orderCode}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Producto</b></td><td style="padding:8px;">${escape(data.productName)}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>SKU</b></td><td style="padding:8px; font-family:monospace;">${data.productSku}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Cantidad</b></td><td style="padding:8px;">${data.quantity}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Total</b></td><td style="padding:8px;"><b>S/ ${data.total.toFixed(2)}</b></td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Cliente</b></td><td style="padding:8px;">${escape(data.clientName)}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Teléfono</b></td><td style="padding:8px;">${escape(data.clientPhone)}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Dirección</b></td><td style="padding:8px;">${escape(data.clientAddress ?? "—")}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Observaciones</b></td><td style="padding:8px;">${escape(data.notes ?? "—")}</td></tr>
          <tr><td style="padding:8px; background:#f5f5f5;"><b>Impulsador</b></td><td style="padding:8px;">${escape(data.impulsadorName ?? "—")}</td></tr>
        </table>
        <p style="margin-top:16px; font-size:12px; color:#888;">Confirma el envío desde la plataforma de dropshipping usando el SKU del producto.</p>
      </div>
    `;

    try {
      const res = await fetch("https://api.lovable.dev/v1/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `HIVECORE <pedidos@${senderDomain}>`,
          to: [OPS_TO],
          cc: [OPS_CC],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[order-email] send failed", res.status, txt);
        return { sent: false, reason: "send_failed" };
      }
      return { sent: true };
    } catch (e) {
      console.error("[order-email] error", e);
      return { sent: false, reason: "exception" };
    }
  });

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
