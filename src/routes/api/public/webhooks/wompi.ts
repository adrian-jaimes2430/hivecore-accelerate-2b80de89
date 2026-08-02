import { createFileRoute } from "@tanstack/react-router";

/**
 * Wompi events webhook.
 * URL: https://hivecore-accelerate.lovable.app/api/public/webhooks/wompi
 * Security: verifies the SHA256 event checksum with WOMPI_EVENTS_SECRET.
 */
export const Route = createFileRoute("/api/public/webhooks/wompi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const { getWompiConfig, verifyEventChecksum, mapWompiStatus } = await import(
          "@/lib/wompi.server"
        );
        const cfg = getWompiConfig();
        if (!cfg?.eventsSecret) {
          console.error("[wompi.webhook] missing WOMPI_EVENTS_SECRET");
          return new Response("Not configured", { status: 503 });
        }
        if (!verifyEventChecksum(body, cfg.eventsSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const tx = body?.data?.transaction;
        const reference: string | undefined = tx?.reference;
        if (!reference) return new Response("Missing reference", { status: 400 });

        const mapped = mapWompiStatus(tx?.status ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, status, payment_status")
          .or(`payment_reference.eq.${reference},order_code.eq.${reference}`)
          .maybeSingle();
        if (!order) return new Response("Order not found", { status: 404 });

        const update: Record<string, unknown> = {
          payment_status: mapped.payment_status,
          payment_provider: "wompi",
          payment_transaction_id: tx?.id ?? null,
          payment_amount:
            tx?.amount_in_cents != null ? Number(tx.amount_in_cents) / 100 : null,
          paid_at: mapped.payment_status === "paid" ? new Date().toISOString() : null,
        };
        if (mapped.order_status) update["status"] = mapped.order_status;

        const { error } = await supabaseAdmin
          .from("orders")
          .update(update as never)
          .eq("id", order.id);
        if (error) {
          console.error("[wompi.webhook] update", error);
          return new Response("Update failed", { status: 500 });
        }

        if (mapped.payment_status !== order.payment_status) {
          const { forwardSafely } = await import("@/lib/checkout.server");
          await forwardSafely(order.id, "order.updated");
        }

        return Response.json({ ok: true });
      },
      GET: async () => Response.json({ ok: true, service: "wompi-events" }),
    },
  },
});
