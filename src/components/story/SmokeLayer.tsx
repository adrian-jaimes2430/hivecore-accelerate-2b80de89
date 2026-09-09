import { useEffect, useRef } from "react";

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  rot: number;
  vr: number;
}

/**
 * Humo volumétrico 2D en canvas: bocanadas suaves que se intensifican con
 * la velocidad de scroll y con el puntero, creando la transición entre
 * secciones de la historia.
 */
export function SmokeLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Textura de humo procedural
    const tex = document.createElement("canvas");
    tex.width = tex.height = 128;
    const tctx = tex.getContext("2d")!;
    const grad = tctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,0.5)");
    grad.addColorStop(0.35, "rgba(199,243,132,0.16)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    tctx.fillStyle = grad;
    tctx.fillRect(0, 0, 128, 128);

    let w = 0;
    let h = 0;
    let raf = 0;
    let puffs: Puff[] = [];
    let lastY = window.scrollY;
    let speed = 0;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (x: number, y: number, power = 1) => {
      if (puffs.length > 90) return;
      puffs.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5 * power,
        vy: -(0.25 + Math.random() * 0.7) * power,
        r: 90 + Math.random() * 190,
        life: 0,
        max: 200 + Math.random() * 220,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.006,
      });
    };

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (Math.random() > 0.7) spawn(e.clientX, e.clientY, 0.7);
    };

    const draw = () => {
      speed += (Math.abs(window.scrollY - lastY) - speed) * 0.15;
      lastY = window.scrollY;

      const rate = 0.25 + Math.min(1, speed / 60) * 0.9;
      if (Math.random() < rate) {
        spawn(Math.random() * w, h * (0.55 + Math.random() * 0.6), 1 + speed / 90);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      puffs = puffs.filter((p) => p.life < p.max);
      for (const p of puffs) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.r += 0.35;

        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 40000 && d2 > 1) {
          const d = Math.sqrt(d2);
          p.vx += (dx / d) * 0.05;
          p.vy += (dy / d) * 0.05;
        }

        const t = p.life / p.max;
        const alpha = Math.sin(t * Math.PI) * 0.34;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(tex, -p.r / 2, -p.r / 2, p.r, p.r);
        ctx.restore();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="story-smoke" aria-hidden="true" />;
}
