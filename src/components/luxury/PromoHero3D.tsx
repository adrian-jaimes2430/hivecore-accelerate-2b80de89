import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Crown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promo } from "./PromoCarousel";

const Canvas = lazy(() => import("./PromoHero3DCanvas"));

/**
 * Banner superior grande del catálogo Luxury: escena 3D con tarjetas
 * flotantes (three.js) y copia superpuesta. El 3D solo carga en cliente.
 */
export function PromoHero3D({ promos }: { promos: Promo[]; images?: string[] }) {
  const slides = useMemo(() => promos.filter((promo) => promo.media_url), [promos]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[active] ?? null;
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
    if (!slide.link_url) return;
    if (slide.link_url.startsWith("http")) window.open(slide.link_url, "_blank", "noopener,noreferrer");
    else window.location.assign(slide.link_url);
  }, [active, changeSlide, slides]);

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!current) return null;

  return (
    <section className="promo-hero3d" aria-label="Novedades AnMa Luxury" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <Canvas promos={slides} active={active} onActiveChange={changeSlide} onActivate={activateSlide} />
        </Suspense>
      </ClientOnly>
      <div className="promo-hero3d-veil" />

      <div className="promo-hero3d-copy">
        <span className="promo-hero3d-kicker"><Crown className="h-3 w-3" /> Publicitario {active + 1} de {slides.length}</span>
        <h2>{current.title ?? "AnMa Luxury Collection"}</h2>
        {current.subtitle && <p>{current.subtitle}</p>}
        {current.link_url && (
          <a
            href={current.link_url}
            target={current.link_url.startsWith("http") ? "_blank" : undefined}
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
