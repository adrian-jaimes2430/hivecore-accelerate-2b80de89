/**
 * Meta Conversions API (server-side).
 *
 * Envía eventos de venta directamente a Meta para que las compras
 * CONTRA ENTREGA (COD) también se midan como `Purchase` y aporten ROAS.
 * Usa el mismo `event_id` que el píxel del navegador, así Meta deduplica.
 */
import { createHash } from "crypto";

const GRAPH_VERSION = "v21.0";

export type MetaPurchasePayload = {
  eventId: string;
  eventName?: "Purchase";
  eventTime?: number;
  value: number;
  currency?: string;
  quantity: number;
  contentId: string;
  contentName?: string | null;
  orderCode: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string;
  fbp?: string | null;
  fbc?: string | null;
  clientUserAgent?: string | null;
  clientIp?: string | null;
  eventSourceUrl?: string | null;
};

const hash = (v?: string | null) => {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return undefined;
  return createHash("sha256").update(s).digest("hex");
};

const normalizePhone = (v?: string | null) => {
  if (!v) return undefined;
  let digits = v.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) digits = `57${digits}`; // Colombia por defecto
  return hash(digits);
};

function getConfig() {
  const pixelId =
    process.env["META_PIXEL_ID"]?.trim() ||
    process.env["VITE_META_PIXEL_ID"]?.trim() ||
    "";
  const accessToken = process.env["META_CAPI_ACCESS_TOKEN"]?.trim() || "";
  const testEventCode = process.env["META_TEST_EVENT_CODE"]?.trim() || "";
  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken, testEventCode };
}

/** Envía un `Purchase` a Meta. No lanza: los fallos solo se registran. */
export async function sendMetaPurchase(p: MetaPurchasePayload): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg) {
    console.warn("[meta-capi] sin META_CAPI_ACCESS_TOKEN/META_PIXEL_ID, evento omitido");
    return false;
  }

  const nameParts = (p.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;

  const user_data: Record<string, unknown> = {
    em: hash(p.email) ? [hash(p.email)] : undefined,
    ph: normalizePhone(p.phone) ? [normalizePhone(p.phone)] : undefined,
    fn: hash(firstName) ? [hash(firstName)] : undefined,
    ln: hash(lastName) ? [hash(lastName)] : undefined,
    ct: hash(p.city?.replace(/\s+/g, "")) ? [hash(p.city?.replace(/\s+/g, ""))] : undefined,
    st: hash(p.region?.replace(/\s+/g, "")) ? [hash(p.region?.replace(/\s+/g, ""))] : undefined,
    country: hash(p.country ?? "co") ? [hash(p.country ?? "co")] : undefined,
    fbp: p.fbp ?? undefined,
    fbc: p.fbc ?? undefined,
    client_user_agent: p.clientUserAgent ?? undefined,
    client_ip_address: p.clientIp ?? undefined,
  };
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: p.eventName ?? "Purchase",
        event_time: p.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: p.eventId,
        action_source: "website",
        event_source_url: p.eventSourceUrl ?? undefined,
        user_data,
        custom_data: {
          currency: p.currency ?? "COP",
          value: Number(p.value ?? 0),
          content_type: "product",
          content_ids: [p.contentId],
          contents: [{ id: p.contentId, quantity: p.quantity }],
          content_name: p.contentName ?? undefined,
          num_items: p.quantity,
          order_id: p.orderCode,
        },
      },
    ],
  };
  if (cfg.testEventCode) body["test_event_code"] = cfg.testEventCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.accessToken)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.error("[meta-capi] error", res.status, (await res.text()).slice(0, 400));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[meta-capi] fetch failed", e);
    return false;
  }
}
