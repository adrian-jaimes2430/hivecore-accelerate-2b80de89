import { useEffect, useRef } from "react";
import storyVideo from "@/assets/story.mp4.asset.json";
import storyPoster from "@/assets/story-poster.jpg.asset.json";

/**
 * Capa de video a pantalla completa que actúa como lienzo de toda la
 * historia. El scroll "rasca" el video (scrubbing) para que cada sección
 * corresponda a un momento distinto del clip, sin oscurecerlo.
 */
export function StoryVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let target = 0;
    let current = 0;
    let scrubbing = false;

    video.play().catch(() => {});

    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const dur = video.duration;

      if (Number.isFinite(dur) && dur > 0) {
        target = p * (dur - 0.05);
        current += (target - current) * 0.1;

        // En la parte superior dejamos que el clip corra solo; a partir de
        // ahí el scroll toma el control del tiempo del video.
        if (p > 0.02) {
          if (!scrubbing) {
            scrubbing = true;
            video.pause();
          }
          if (Math.abs(video.currentTime - current) > 0.03) {
            video.currentTime = current;
          }
        } else if (scrubbing) {
          scrubbing = false;
          current = video.currentTime;
          video.play().catch(() => {});
        }
      }
      raf = requestAnimationFrame(tick);
    };

    if (!reduce) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="story-video-layer" aria-hidden="true">
      <video
        ref={ref}
        className="story-video"
        src={storyVideo.url}
        poster={storyPoster.url}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
      <div className="story-video-vignette" />
    </div>
  );
}
