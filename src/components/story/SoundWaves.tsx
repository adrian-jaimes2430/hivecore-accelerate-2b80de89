import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import music from "@/assets/story-music.mp3.asset.json";

/**
 * Música de fondo + ondas de sonido en la parte inferior.
 * El audio intenta arrancar solo; si el navegador lo bloquea, se activa con
 * el primer gesto (scroll, movimiento del puntero, toque o tecla).
 */
export function SoundWaves() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio(music.url);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;

    let ctx: AudioContext | null = null;
    let fade = 0;

    const connect = () => {
      if (ctx || !window.AudioContext) return;
      try {
        ctx = new AudioContext();
        const src = ctx.createMediaElementSource(audio);
        const node = ctx.createAnalyser();
        node.fftSize = 128;
        node.smoothingTimeConstant = 0.82;
        src.connect(node);
        node.connect(ctx.destination);
        analyser.current = node;
      } catch {
        ctx = null;
      }
    };

    const start = async () => {
      connect();
      if (ctx?.state === "suspended") await ctx.resume().catch(() => undefined);
      try {
        await audio.play();
        setPlaying(true);
        clearInterval(fade);
        fade = window.setInterval(() => {
          audio.volume = Math.min(0.5, audio.volume + 0.03);
          if (audio.volume >= 0.5) clearInterval(fade);
        }, 80) as unknown as number;
        detach();
      } catch {
        /* esperamos un gesto del usuario */
      }
    };

    const onGesture = () => void start();
    const events = ["pointerdown", "pointermove", "wheel", "touchstart", "keydown", "scroll"] as const;
    const detach = () => events.forEach((e) => window.removeEventListener(e, onGesture));
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    void start();

    // ── Ondas ──────────────────────────────────────────────────────────
    const el = canvas.current;
    let raf = 0;
    let lastY = window.scrollY;
    let velocity = 0;

    const onScroll = () => {
      velocity = Math.min(1, Math.abs(window.scrollY - lastY) / 60);
      lastY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    if (el) {
      const g = el.getContext("2d");
      const bins = new Uint8Array(64);
      const smooth = new Float32Array(64);
      let t = 0;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio, 2);
        el.width = Math.floor(el.clientWidth * dpr);
        el.height = Math.floor(el.clientHeight * dpr);
        g?.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize);

      const draw = () => {
        raf = requestAnimationFrame(draw);
        if (!g) return;
        t += 0.03;
        velocity *= 0.93;

        const w = el.clientWidth;
        const h = el.clientHeight;
        g.clearRect(0, 0, w, h);

        if (analyser.current) analyser.current.getByteFrequencyData(bins);

        const n = 64;
        const gap = 2;
        const bw = Math.max(2, w / n - gap);
        for (let i = 0; i < n; i += 1) {
          const live = analyser.current ? bins[i] / 255 : 0;
          const idle = 0.12 + Math.sin(t + i * 0.35) * 0.06 + Math.sin(t * 0.7 + i) * 0.04;
          const target = Math.max(idle, live) * (1 + velocity * 0.9);
          smooth[i] += (target - smooth[i]) * 0.22;
          const bh = Math.max(2, smooth[i] * h * 0.92);
          const x = i * (bw + gap);
          const grad = g.createLinearGradient(0, h, 0, h - bh);
          grad.addColorStop(0, "rgba(199,243,132,0.18)");
          grad.addColorStop(1, "rgba(199,243,132,0.95)");
          g.fillStyle = grad;
          g.beginPath();
          g.roundRect(x, h - bh, bw, bh, bw / 2);
          g.fill();
        }
      };
      draw();
    }

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(fade);
      detach();
      window.removeEventListener("scroll", onScroll);
      audio.pause();
      audio.src = "";
      void ctx?.close();
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    const next = !muted;
    a.muted = next;
    setMuted(next);
    if (!next && a.paused) void a.play().catch(() => undefined);
  };

  return (
    <>
      <div className="story-waves" aria-hidden="true">
        <canvas ref={canvas} className="h-full w-full" />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? "Activar música" : "Silenciar música"}
        className="story-sound-btn"
        data-off={muted || !playing}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </>
  );
}
