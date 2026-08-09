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
export function metaTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}

export const GLOBAL_META_PIXEL_ID: string =
  (import.meta.env['VITE_META_PIXEL_ID'] as string | undefined)?.trim() ?? "";

/** Site-wide base pixel: the base code is already injected in __root.tsx head().
 *  This component only re-fires PageView on client-side navigations. */
export function GlobalMetaPixel() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!GLOBAL_META_PIXEL_ID) return;
    metaTrack("PageView");
  }, [pathname]);

  return null;
}

export function MetaPixel({
  pixelId,
  testEventCode,
  contentId,
  contentName,
  value,
  currency = "COP",
}: {
  pixelId?: string | null;
  testEventCode?: string | null;
  contentId?: string | null;
  contentName?: string | null;
  value?: number | null;
  currency?: string;
}) {
  const started = useRef(false);

  useEffect(() => {
    const id = pixelId?.trim();
    if (!id || started.current) return;
    started.current = true;
    ensurePixel(id, testEventCode ?? null);
    metaTrack("PageView");
    metaTrack("ViewContent", {
      content_ids: contentId ? [contentId] : undefined,
      content_name: contentName ?? undefined,
      content_type: "product",
      value: value ?? undefined,
      currency,
    });
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
