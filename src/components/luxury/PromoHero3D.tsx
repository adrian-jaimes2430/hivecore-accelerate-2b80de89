import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promo } from "./PromoCarousel";

const APP_HOSTS = new Set([
  "hivecore-shop.lovable.app",
  "hivecore-accelerate.lovable.app",
  "hivecore-shop.ayoecosystem.com",
]);

function promoHref(link: string | null) {
  if (!link) return null;
  try {
    const origin = typeof window === "undefined" ? "https://hivecore-shop.ayoecosystem.com" : window.location.origin;
    const parsed = new URL(link, origin);
    return APP_HOSTS.has(parsed.hostname) ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.href;
  } catch {
    return null;
  }
}

/**
 * Banner superior del catálogo: abanico de tarjetas de tamaño casi uniforme
 * repartidas a todo el ancho del marco. Solo publicitarios publicados.
 */
export function PromoHero3D({ promos }: { promos: Promo[]; images?: string[] }) {
  const slides = useMemo(() => promos.filter((promo) => promo.media_url), [promos]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[active] ?? null;
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const changeSlide = useCallback((index: number) => {
    if (slides.length === 0) return;
    setActive((index + slides.length) % slides.length);
  }, [slides.length]);
  const activateSlide = useCallback((index: number) => {
    const slide = slides[index];
    if (!slide) return;
    if (index !== active) {
      changeSlide(index);
      return;
    }
    const href = promoHref(slide.link_url);
    if (!href) return;
    if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
    else window.location.assign(href);
  }, [active, changeSlide, slides]);

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const visibleCards = useMemo(() => {
    if (slides.length === 2) {
      // Con dos publicitarios la tarjeta activa va al centro y la otra se
      // refleja a ambos lados para que el abanico ocupe todo el ancho.
      const otherIndex = (active + 1) % 2;
      return [
        { key: `${slides[otherIndex].id}-l`, slide: slides[otherIndex], index: otherIndex, offset: -1 },
        { key: `${slides[active].id}-c`, slide: slides[active], index: active, offset: 0 },
        { key: `${slides[otherIndex].id}-r`, slide: slides[otherIndex], index: otherIndex, offset: 1 },
      ];
    }
    return slides
      .map((slide, index) => {
        let offset = index - active;
        if (offset > slides.length / 2) offset -= slides.length;
        if (offset < -slides.length / 2) offset += slides.length;
        return { key: slide.id, slide, index, offset };
      })
      .filter(({ offset }) => Math.abs(offset) <= 2);
  }, [slides, active]);

  if (!current) return null;

  return (
    <section
      className="promo-hero3d"
      aria-label="Novedades AnMa Luxury"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => { setPaused(false); dragStart.current = null; }}
      onPointerDown={(event) => { dragStart.current = { x: event.clientX, y: event.clientY }; }}
      onPointerUp={(event) => {
        const start = dragStart.current;
        dragStart.current = null;
        if (!start || slides.length < 2) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) changeSlide(active + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="promo-hero3d-stage" aria-label="Publicitarios publicados">
        {visibleCards.map(({ key, slide, index, offset }) => (
          <Button
            key={key}
            type="button"
            variant="ghost"
            className="promo-hero3d-card"
            data-position={offset}
            aria-label={index === active ? `Abrir ${slide.title ?? "publicitario"}` : `Mostrar ${slide.title ?? "publicitario"}`}
            onClick={() => activateSlide(index)}
          >
            {slide.media_type === "video" ? (
              <video
                src={slide.media_url}
                muted
                loop
                autoPlay
                playsInline
                preload={index === active ? "auto" : "metadata"}
                onLoadedData={(event) => {
                  const video = event.currentTarget;
                  if (video.currentTime < 0.2) video.currentTime = 0.5;
                  void video.play().catch(() => undefined);
                }}
              />
            ) : (
              <img src={slide.media_url} alt={slide.title ?? "Publicitario AnMa Luxury"} loading={index === active ? "eager" : "lazy"} decoding="async" />
            )}
            <span className="promo-hero3d-card-shade" />
          </Button>
        ))}
      </div>
      <div className="promo-hero3d-veil" />

      <div className="promo-hero3d-copy">
        <span className="promo-hero3d-kicker"><Crown className="h-3 w-3" /> Publicitario {active + 1} de {slides.length}</span>
        <h2>{current.title ?? "AnMa Luxury Collection"}</h2>
        {current.subtitle && <p>{current.subtitle}</p>}
        {promoHref(current.link_url) && (
          <a
            href={promoHref(current.link_url) ?? undefined}
            target={promoHref(current.link_url)?.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="promo-hero3d-link"
          >
            {current.cta_label ?? "Ver ahora"} <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>

      {slides.length > 1 && (
        <div className="promo-hero3d-controls">
          <Button variant="ghost" size="icon" aria-label="Promoción anterior" onClick={() => changeSlide(active - 1)}>
            <ChevronLeft />
          </Button>
          <div className="flex items-center gap-1.5" aria-label={`${active + 1} de ${slides.length}`}>
            {slides.map((slide, index) => (
              <Button key={slide.id} variant="ghost" size="icon" aria-label={`Ver promoción ${index + 1}`} data-active={index === active} onClick={() => changeSlide(index)} />
            ))}
          </div>
          <Button variant="ghost" size="icon" aria-label="Promoción siguiente" onClick={() => changeSlide(active + 1)}>
            <ChevronRight />
          </Button>
        </div>
      )}
    </section>
  );
}
