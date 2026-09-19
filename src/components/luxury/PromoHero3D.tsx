import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Crown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Promo } from "./PromoCarousel";

const Canvas = lazy(() => import("./PromoHero3DCanvas"));

/**
 * Banner superior grande del catálogo Luxury: escena 3D con tarjetas
 * flotantes (three.js) y copia superpuesta. El 3D solo carga en cliente.
 */
export function PromoHero3D({ promos, images = [] }: { promos: Promo[]; images?: string[] }) {
  const slides = useMemo(() => {
    const promoSlides = promos.filter((p) => p.media_url);
    if (promoSlides.length > 0) return promoSlides;
    return images.slice(0, 8).map((media_url, index) => ({
      id: `product-${index}`,
      title: index === 0 ? "AnMa Luxury Collection" : "Selección AnMa",
      subtitle: "Piezas seleccionadas para momentos excepcionales",
      media_type: "image",
      media_url,
      link_url: null,
      cta_label: null,
    }));
  }, [images, promos]);
  const [active, setActive] = useState(0);
  const current = slides[active] ?? null;
  const changeSlide = useCallback((index: number) => {
    if (slides.length === 0) return;
    setActive((index + slides.length) % slides.length);
  }, [slides.length]);

  return (
    <section className="promo-hero3d" aria-label="Novedades AnMa Luxury">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <Canvas promos={slides} active={active} onActiveChange={changeSlide} />
        </Suspense>
      </ClientOnly>
      <div className="promo-hero3d-veil" />

      <div className="promo-hero3d-copy">
        <span className="promo-hero3d-kicker"><Crown className="h-3 w-3" /> Novedades</span>
        <h2>{current?.title ?? "AnMa Luxury Collection"}</h2>
        <p>{current?.subtitle ?? "Piezas seleccionadas para momentos excepcionales"}</p>
        {current?.link_url && (
          <a
            href={current.link_url}
            target={current.link_url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="promo-hero3d-link"
          >
            {current.cta_label ?? "Ver colección"} <ArrowRight className="h-4 w-4" />
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
              <button key={slide.id} type="button" aria-label={`Ver promoción ${index + 1}`} data-active={index === active} onClick={() => changeSlide(index)} />
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
