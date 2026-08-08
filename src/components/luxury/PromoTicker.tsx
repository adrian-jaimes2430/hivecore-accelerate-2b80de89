import { ArrowRight } from "lucide-react";
import type { Promo } from "./PromoCarousel";

/**
 * Barra superior de publicidad estilo shop.app: cinta delgada con
 * items que se desplazan en bucle continuo.
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

function PromoItem({ p }: { p: Promo }) {
  const content = (
    <>
      {p.media_type !== "video" && p.media_url && (
        <img src={p.media_url} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" loading="lazy" />
      )}
      <span className="font-semibold">{p.title ?? "Novedades"}</span>
      {p.subtitle && <span className="text-muted-foreground">{p.subtitle}</span>}
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-hive" />
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
