import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Crown, ArrowRight } from "lucide-react";
import type { Promo } from "./PromoCarousel";

const Canvas = lazy(() => import("./PromoHero3DCanvas"));

/**
 * Banner superior grande del catálogo Luxury: escena 3D con tarjetas
 * flotantes (three.js) y copia superpuesta. El 3D solo carga en cliente.
 */
export function PromoHero3D({ promos, images = [] }: { promos: Promo[]; images?: string[] }) {
  const featured = promos.find((p) => p.title) ?? promos[0] ?? null;

  return (
    <section className="promo-hero3d">
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(201,168,76,0.22),transparent_60%)]" />
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <Canvas promos={promos} images={images} />
        </Suspense>
      </ClientOnly>
      <div className="promo-hero3d-veil" />

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[color:var(--luxury-gold)] backdrop-blur">
          <Crown className="h-3 w-3" /> {featured?.subtitle ?? "Colección Premium"}
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
          <span className="luxury-gradient-text">{featured?.title ?? "AnMa Luxury Collection"}</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
          Perfumería, relojería, joyería AAA y marroquinería de autor. Escribe abajo lo que buscas y lo
          encontramos por ti.
        </p>
        {featured?.link_url && (
          <a
            href={featured.link_url}
            target={featured.link_url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--luxury-gold)] px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            {featured.cta_label ?? "Ver colección"} <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </section>
  );
}
