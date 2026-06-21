import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Loader2, ImagePlus, Film, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  videos: string[];
  onChange: (next: { images: string[]; videos: string[] }) => void;
  folder: string;
  label?: string;
  maxItems?: number;
  videoMaxMb?: number;
}

export function GalleryUploader({
  images,
  videos,
  onChange,
  folder,
  label = "Galería",
  maxItems = 14,
  videoMaxMb = 80,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const total = images.length + videos.length;

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const nextImages = [...images];
    const nextVideos = [...videos];
    let added = 0;
    for (const file of Array.from(files)) {
      if (nextImages.length + nextVideos.length >= maxItems) break;
      const isVideo = file.type.startsWith("video/");
      if (isVideo && file.size > videoMaxMb * 1024 * 1024) {
        toast.error(`"${file.name}" supera ${videoMaxMb}MB`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) {
        toast.error(`Error al subir ${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      if (isVideo) nextVideos.push(data.publicUrl);
      else nextImages.push(data.publicUrl);
      added++;
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (added) {
      onChange({ images: nextImages, videos: nextVideos });
      toast.success(`${added} archivo(s) agregado(s)`);
    }
  };

  const removeImage = (u: string) => onChange({ images: images.filter((x) => x !== u), videos });
  const removeVideo = (u: string) => onChange({ images, videos: videos.filter((x) => x !== u) });
  const reorderImage = (i: number, dir: -1 | 1) => {
    const arr = [...images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ images: arr, videos });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label} ({total}/{maxItems}) · imágenes y videos
        </label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={uploading || total >= maxItems}
          onClick={() => inputRef.current?.click()}
          className="h-7 border border-border/60"
        >
          {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
          Subir
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />

      {total === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:bg-white/5"
        >
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4" /> <Film className="h-4 w-4" />
          </div>
          Arrastra o haz clic para subir imágenes o videos
        </button>
      ) : (
        <>
          {images.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Imágenes ({images.length})</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {images.map((u, i) => (
                  <div key={u} className="group relative aspect-square overflow-hidden rounded-md border border-border/40">
                    <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] uppercase text-white">Portada</span>
                    )}
                    <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" onClick={() => reorderImage(i, -1)} className="rounded-full bg-black/70 p-1">
                        <ChevronLeft className="h-3 w-3 text-white" />
                      </button>
                      <button type="button" onClick={() => reorderImage(i, 1)} className="rounded-full bg-black/70 p-1">
                        <ChevronRight className="h-3 w-3 text-white" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(u)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {videos.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Videos ({videos.length})</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {videos.map((u) => (
                  <div key={u} className="group relative overflow-hidden rounded-md border border-border/40">
                    <video src={u} controls preload="metadata" className="block h-auto w-full max-h-48 bg-black" />
                    <button
                      type="button"
                      onClick={() => removeVideo(u)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-90 hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
