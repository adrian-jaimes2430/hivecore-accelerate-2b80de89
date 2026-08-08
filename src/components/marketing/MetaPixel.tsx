import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: unknown };
    _fbq?: unknown;
  }
}

/** Injects the Meta (Facebook) Pixel base code once and fires PageView. */
function loadPixel(pixelId: string, testEventCode?: string | null) {
  if (typeof window === "undefined") return;

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

  const opts = testEventCode ? { test_event_code: testEventCode } : undefined;
  window.fbq!("init", pixelId, undefined, opts);
  window.fbq!("track", "PageView", undefined, opts);
}

/** Fire a standard Meta Pixel event (safe no-op when no pixel is loaded). */
export function metaTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
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
    loadPixel(id, testEventCode ?? null);
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
