import { useEffect, useRef, useState } from "react";

/**
 * Video de funnel que se reproduce automáticamente (silenciado) al entrar en pantalla
 * y se pausa al salir, para no gastar datos ni bloquear la carga inicial.
 */
export function AutoVideo({
  src,
  poster,
  eager = false,
  className = "",
}: {
  src: string;
  poster?: string;
  eager?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!el.src) el.src = src;
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.35, rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return (
    <div className="relative">
      <video
        ref={ref}
        {...(eager ? { src } : {})}
        poster={poster}
        muted={muted}
        loop
        playsInline
        autoPlay={eager}
        controls
        preload={eager ? "metadata" : "none"}
        className={className}
      />
      {muted && (
        <button
          type="button"
          onClick={() => {
            setMuted(false);
            const el = ref.current;
            if (el) {
              el.muted = false;
              el.play().catch(() => {});
            }
          }}
          className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/85"
          aria-label="Activar sonido del video"
        >
          🔇 Activar sonido
        </button>
      )}
    </div>
  );
}
