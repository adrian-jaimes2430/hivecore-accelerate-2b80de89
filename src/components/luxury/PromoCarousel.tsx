import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export interface Promo {
  id: string;
  title: string | null;
  subtitle: string | null;
  media_type: string;
  media_url: string;
  link_url: string | null;
  cta_label: string | null;
}

export function PromoCarousel({ promos, autoMs = 6000 }: { promos: Promo[]; autoMs?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = promos.length;

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % n), autoMs);
    return () => window.clearInterval(t);
  }, [n, paused, autoMs]);

  if (n === 0) return null;
  const p = promos[i];

  return (
    <section
      className="relative mb-10 overflow-hidden rounded-2xl border border-[color:var(--luxury-gold)]/30 bg-black animate-fade-up"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[21/9] w-full sm:aspect-[21/8]">
        {promos.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {slide.media_type === "video" ? (
              <video
                src={slide.media_url}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <img src={slide.media_url} alt={slide.title ?? ""} className="h-full w-full object-cover" loading={idx === 0 ? "eager" : "lazy"} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
        ))}

        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-10">
          <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[color:var(--luxury-gold)] backdrop-blur">
            <Sparkles className="h-3 w-3" /> Novedades
          </div>
          {p.title && (
            <h2 className="mt-3 font-display text-2xl font-bold luxury-gradient-text sm:text-4xl drop-shadow-lg">
              {p.title}
            </h2>
          )}
          {p.subtitle && (
            <p className="mt-1 max-w-xl text-sm text-zinc-200 sm:text-base">{p.subtitle}</p>
          )}
          {p.link_url && (
            <a
              href={p.link_url}
              target={p.link_url.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--luxury-gold)] px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-transform hover:scale-105"
            >
              {p.cta_label ?? "Ver más"} <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>

        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => setI((x) => (x - 1 + n) % n)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-70 backdrop-blur transition hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setI((x) => (x + 1) % n)}
              aria-label="Siguiente"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white opacity-70 backdrop-blur transition hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {promos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-[color:var(--luxury-gold)]" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
