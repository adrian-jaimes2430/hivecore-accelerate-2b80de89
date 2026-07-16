import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["update", "delete"]),
  external_ref: z.string().optional(),
  order_code: z.string().optional(),
  changes: z.record(z.any()).optional(),
});

// Whitelist columns AO CORE OS can update on a HiveCore order.
const ALLOWED_UPDATE_FIELDS = new Set([
  "status",
  "client_name",
  "client_phone",
  "client_address",
  "quantity",
  "total",
  "notes",
  "external_ref",
]);

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function verifySignature(rawBody: string, header: string | null, secret: string) {
  if (!header) return false;
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/integrations/aocore/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AOCORE_INBOUND_SECRET;
        if (!secret) {
          return jsonResponse(500, { ok: false, error: "server_not_configured" });
        }

        // Bearer auth
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : "";
        const tokenOk =
          token.length > 0 &&
          token.length === secret.length &&
          timingSafeEqual(Buffer.from(token), Buffer.from(secret));
        if (!tokenOk) {
          return jsonResponse(401, { ok: false, error: "unauthorized" });
        }

        const rawBody = await request.text();
        const sigHeader = request.headers.get("x-ao-signature");
        if (!verifySignature(rawBody, sigHeader, secret)) {
          return jsonResponse(401, { ok: false, error: "invalid_signature" });
        }

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(JSON.parse(rawBody));
        } catch (e: any) {
          return jsonResponse(400, { ok: false, error: "invalid_body", detail: e?.message });
        }

        if (!parsed.external_ref && !parsed.order_code) {
          return jsonResponse(400, {
            ok: false,
            error: "missing_identifier",
            detail: "external_ref or order_code is required",
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Locate the order — try external_ref first, then fall back to order_code
        // (A&O CORE OS may send our HiveCore order_code as their external_ref
        // when we didn't return an id on the outbound webhook).
        async function findOrder() {
          if (parsed.external_ref) {
            const r1 = await supabaseAdmin
              .from("orders")
              .select("id, order_code, external_ref")
              .eq("external_ref", parsed.external_ref)
              .maybeSingle();
            if (r1.error) return r1;
            if (r1.data) return r1;
            // Fallback: external_ref may actually be our order_code
            const r2 = await supabaseAdmin
              .from("orders")
              .select("id, order_code, external_ref")
              .eq("order_code", parsed.external_ref)
              .maybeSingle();
            return r2;
          }
          return await supabaseAdmin
            .from("orders")
            .select("id, order_code, external_ref")
            .eq("order_code", parsed.order_code!)
            .maybeSingle();
        }
        const { data: order, error: findErr } = await findOrder();
        if (findErr) {
          console.error("[aocore.inbound] find", findErr);
          return jsonResponse(500, { ok: false, error: "lookup_failed" });
        }
        if (!order) {
          return jsonResponse(404, { ok: false, error: "order_not_found" });
        }

        if (parsed.action === "delete") {
          const { error } = await supabaseAdmin
            .from("orders")
            .delete()
            .eq("id", order.id);
          if (error) {
            console.error("[aocore.inbound] delete", error);
            return jsonResponse(500, { ok: false, error: "delete_failed" });
          }
          return jsonResponse(200, { ok: true, action: "delete", id: order.id });
        }

        // action === "update"
        // Normalize incoming status values to our order_status enum:
        // pending | confirmed | shipped | delivered | cancelled.
        // A&O CORE OS sends Spanish labels ("Confirmado", "Enviado", ...).
        const STATUS_MAP: Record<string, string> = {
          pending: "pending", pendiente: "pending", nuevo: "pending", new: "pending",
          confirmed: "confirmed", confirmado: "confirmed", aprobado: "confirmed", approved: "confirmed", processing: "confirmed", "en proceso": "confirmed",
          shipped: "shipped", enviado: "shipped", despachado: "shipped", "en camino": "shipped",
          delivered: "delivered", entregado: "delivered", completado: "delivered", completed: "delivered",
          cancelled: "cancelled", canceled: "cancelled", cancelado: "cancelled", anulado: "cancelled", rechazado: "cancelled", rejected: "cancelled",
        };
        const changes = parsed.changes ?? {};
        const update: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(changes)) {
          if (!ALLOWED_UPDATE_FIELDS.has(k)) continue;
          if (k === "status" && typeof v === "string") {
            const mapped = STATUS_MAP[v.trim().toLowerCase()];
            if (!mapped) {
              return jsonResponse(400, {
                ok: false,
                error: "invalid_status",
                detail: `Unknown status "${v}". Allowed: pending, confirmed, shipped, delivered, cancelled.`,
              });
            }
            update[k] = mapped;
          } else {
            update[k] = v;
          }
        }
        if (Object.keys(update).length === 0) {
          return jsonResponse(400, { ok: false, error: "no_valid_fields" });
        }
        (update as any).external_synced_at = new Date().toISOString();

        const { error } = await supabaseAdmin
          .from("orders")
          .update(update as never)
          .eq("id", order.id);
        if (error) {
          console.error("[aocore.inbound] update", error);
          return jsonResponse(500, { ok: false, error: "update_failed", detail: error.message });
        }
        return jsonResponse(200, {
          ok: true,
          action: "update",
          id: order.id,
          applied: Object.keys(update),
        });

      },
    },
  },
});
