import { useState } from "react";
import { Play } from "lucide-react";

export interface MediaItem {
  type: "image" | "video";
  url: string;
}

export function buildMedia(images: unknown, videos: unknown): MediaItem[] {
  const imgs = Array.isArray(images) ? (images as string[]) : [];
  const vids = Array.isArray(videos) ? (videos as string[]) : [];
  return [
    ...imgs.map((u) => ({ type: "image" as const, url: u })),
    ...vids.map((u) => ({ type: "video" as const, url: u })),
  ];
}

export function MediaGallery({
  media,
  fallbackInitial,
  accentClass = "border-[color:var(--luxury-gold)]",
}: {
  media: MediaItem[];
  fallbackInitial: string;
  accentClass?: string;
}) {
  const [active, setActive] = useState(0);
  const item = media[active];

  if (media.length === 0) {
    return (
      <div className="aspect-[4/5] flex items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--luxury-gold)]/20 bg-zinc-950 font-display text-7xl opacity-20">
        {fallbackInitial}
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-[color:var(--luxury-gold)]/20 bg-zinc-950 luxury-shine">
        {item.type === "video" ? (
          <video
            key={item.url}
            src={item.url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="h-full w-full object-contain bg-black"
          />
        ) : (
          <img key={item.url} src={item.url} alt="" className="h-full w-full object-cover animate-fade-in" />
        )}
      </div>
      {media.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {media.map((m, i) => (
            <button
              key={m.url}
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-md border transition ${
                i === active ? accentClass : "border-border/40 opacity-70 hover:opacity-100"
              }`}
            >
              {m.type === "video" ? (
                <>
                  <video src={m.url} muted className="h-full w-full object-cover" preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
