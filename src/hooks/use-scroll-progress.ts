import { useEffect, useRef, useState } from "react";

/**
 * Progreso de scroll de la página (0 → 1) suavizado, más la velocidad
 * instantánea. Se actualiza en rAF para no bloquear el hilo principal.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const velocity = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let smooth = 0;

    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      smooth += (raw - smooth) * 0.12;
      velocity.current = Math.abs(smooth - last);
      last = smooth;
      setProgress(smooth);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { progress, velocity };
}
