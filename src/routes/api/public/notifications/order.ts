import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const bodySchema = z.object({ orderId: z.string().uuid() });

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/notifications/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ORDER_NOTIFY_SECRET"];
        if (!secret) return new Response("Not configured", { status: 500 });

        const provided = request.headers.get("x-notify-secret") ?? "";
        if (!safeEqual(provided, secret)) return new Response("Unauthorized", { status: 401 });

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { loadOrderAlert, dispatchOrderAlert } = await import("@/lib/order-notify.server");
        const alert = await loadOrderAlert(parsed.orderId);
        if (!alert) return Response.json({ ok: false, error: "order_not_found" }, { status: 404 });

        const results = await dispatchOrderAlert(alert);
        return Response.json({ ok: true, results });
      },
    },
  },
});
