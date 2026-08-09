import { ArrowRight } from "lucide-react";
import type { Promo } from "./PromoCarousel";

/**
 * Barra superior de publicidad estilo shop.app: cinta delgada con
 * miniaturas en tarjetas que se desplazan en bucle continuo.
 */
export function PromoTicker({ promos }: { promos: Promo[] }) {
  if (promos.length === 0) return null;
  const items = promos.length < 4 ? [...promos, ...promos, ...promos] : promos;
  const loop = [...items, ...items];

  return (
    <div className="promo-ticker">
      <div className="promo-ticker-track">
        {loop.map((p, i) => (
          <PromoItem key={`${p.id}-${i}`} p={p} />
        ))}
      </div>
    </div>
  );
}

function Thumb({ p }: { p: Promo }) {
  if (!p.media_url) return null;
  return (
    <span className="promo-ticker-thumb">
      {p.media_type === "video" ? (
        <video src={p.media_url} muted playsInline autoPlay loop preload="metadata" />
      ) : (
        <img src={p.media_url} alt="" loading="lazy" />
      )}
    </span>
  );
}

function PromoItem({ p }: { p: Promo }) {
  const content = (
    <>
      <Thumb p={p} />
      <span className="promo-ticker-copy">
        <span className="promo-ticker-title">{p.title ?? "Novedades"}</span>
        {p.subtitle && <span className="promo-ticker-sub">{p.subtitle}</span>}
      </span>
      <span className="promo-ticker-cta">
        {p.cta_label ?? "Ver"}
        <ArrowRight className="h-3 w-3" />
      </span>
    </>
  );

  return p.link_url ? (
    <a
      href={p.link_url}
      target={p.link_url.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="promo-ticker-item"
    >
      {content}
    </a>
  ) : (
    <span className="promo-ticker-item">{content}</span>
  );
}
