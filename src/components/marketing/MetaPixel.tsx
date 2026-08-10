import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown };
    _fbq?: unknown;
  }
}

const initialized = new Set<string>();

/** Injects the Meta (Facebook) Pixel base code once (idempotent) and initializes the given id. */
export function ensurePixel(pixelId: string, testEventCode?: string | null) {
  if (typeof window === "undefined") return;
  const id = pixelId.trim();
  if (!id) return;

  if (!window.fbq) {
    const n: any = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue!.push(args);
    };
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    window._fbq = n;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }

  if (initialized.has(id)) return;
  initialized.add(id);
  const opts = testEventCode ? { test_event_code: testEventCode } : undefined;
  window.fbq!("init", id, undefined, opts);
}

/** Fire a standard Meta Pixel event (safe no-op when no pixel is loaded). */
export function metaTrack(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventID) window.fbq("track", event, params, { eventID });
  else window.fbq("track", event, params);
}

/**
 * Tráfico pago: solo consideramos "paid traffic" las visitas al funnel/catálogo
 * público que NO llegan con un `ref` de impulsador. Los pedidos de impulsadores
 * no deben medirse en el pixel de Meta Ads.
 */
export function isPaidTraffic(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  const ref = q.get("ref");
  return !ref;
}

/** Genera un event_id único para deduplicar eventos en Meta. */
export function newEventId(prefix = "ev") {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rnd}`;
}

/**
 * Envía el evento SOLO si la visita es tráfico pago (sin `ref` de impulsador).
 * Devuelve el eventID usado (o null si no se envió).
 */
export function metaTrackPaid(
  event: string,
  params?: Record<string, unknown>,
  opts?: { paid?: boolean; eventID?: string },
): string | null {
  const paid = opts?.paid ?? isPaidTraffic();
  if (!paid) return null;
  const eventID = opts?.eventID ?? newEventId(event.toLowerCase());
  metaTrack(event, params, eventID);
  return eventID;
}

export const GLOBAL_META_PIXEL_ID: string =
  (import.meta.env['VITE_META_PIXEL_ID'] as string | undefined)?.trim() ?? "";


/** Site-wide base pixel: the base code is already injected in __root.tsx head().
 *  This component only re-fires PageView on client-side navigations (solo tráfico pago). */
export function GlobalMetaPixel() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!GLOBAL_META_PIXEL_ID) return;
    if (!isPaidTraffic()) return;
    metaTrackPaid("PageView");
  }, [pathname]);

  return null;
}

/**
 * Envía `ViewContent` con el píxel global del sitio (el que ya está inicializado
 * en el <head>). Se usa en fichas de producto que no tienen píxel propio, para
 * que Meta pueda medir vistas de producto y optimizar campañas.
 */
export function MetaViewContent({
  contentId,
  contentName,
  value,
  currency = "COP",
  paid,
}: {
  contentId?: string | null;
  contentName?: string | null;
  value?: number | null;
  currency?: string;
  paid?: boolean;
}) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!GLOBAL_META_PIXEL_ID) return;
    const key = String(contentId ?? contentName ?? "");
    if (!key || sent.current === key) return;
    const isPaid = paid ?? isPaidTraffic();
    if (!isPaid) return;
    sent.current = key;
    metaTrackPaid(
      "ViewContent",
      {
        content_ids: contentId ? [contentId] : undefined,
        content_name: contentName ?? undefined,
        content_type: "product",
        contents: contentId ? [{ id: contentId, quantity: 1 }] : undefined,
        value: value ?? undefined,
        currency,
      },
      { paid: isPaid },
    );
  }, [contentId, contentName, value, currency, paid]);

  return null;
}


export function MetaPixel({
  pixelId,
  testEventCode,
  contentId,
  contentName,
  value,
  currency = "COP",
  paid,
}: {
  pixelId?: string | null;
  testEventCode?: string | null;
  contentId?: string | null;
  contentName?: string | null;
  value?: number | null;
  currency?: string;
  /** Fuerza el modo tráfico pago (por defecto se detecta por ausencia de `ref`). */
  paid?: boolean;
}) {
  const started = useRef(false);

  useEffect(() => {
    const id = pixelId?.trim();
    if (!id || started.current) return;
    const isPaid = paid ?? isPaidTraffic();
    if (!isPaid) return;
    started.current = true;
    ensurePixel(id, testEventCode ?? null);
    metaTrackPaid("PageView", undefined, { paid: isPaid });
    metaTrackPaid(
      "ViewContent",
      {
        content_ids: contentId ? [contentId] : undefined,
        content_name: contentName ?? undefined,
        content_type: "product",
        contents: contentId ? [{ id: contentId, quantity: 1 }] : undefined,
        value: value ?? undefined,
        currency,
      },
      { paid: isPaid },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelId]);


  if (!pixelId?.trim()) return null;

  return (
    <noscript>
      <img
        height={1}
        width={1}
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
