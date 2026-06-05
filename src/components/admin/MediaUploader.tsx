import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Loader2, ImagePlus, Film } from "lucide-react";

interface Props {
  image?: string;
  video?: string;
  onChange: (next: { image?: string; video?: string }) => void;
  folder: string;
  label?: string;
}

const VIDEO_MAX_MB = 50;

export function MediaUploader({ image, video, onChange, folder, label = "Medio" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<"image" | "video">(video ? "video" : "image");
  const inputRef = useRef<HTMLInputElement>(null);

  const current = kind === "video" ? video : image;

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (kind === "video" && file.size > VIDEO_MAX_MB * 1024 * 1024) {
      toast.error(`El video no puede superar ${VIDEO_MAX_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? (kind === "video" ? "mp4" : "jpg");
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange(kind === "video" ? { image: undefined, video: data.publicUrl } : { image: data.publicUrl, video: undefined });
      toast.success(kind === "video" ? "Video subido" : "Imagen subida");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () => onChange({ image: undefined, video: undefined });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setKind("image")}
            className={`h-7 border ${kind === "image" ? "border-hive/60 text-hive" : "border-border/60"}`}
          >
            <ImagePlus className="mr-1 h-3 w-3" /> Imagen
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setKind("video")}
            className={`h-7 border ${kind === "video" ? "border-hive/60 text-hive" : "border-border/60"}`}
          >
            <Film className="mr-1 h-3 w-3" /> Video
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-7 border border-border/60"
          >
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            Subir
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "video" ? "video/*" : "image/*"}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {!current ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border/60 text-xs text-muted-foreground hover:bg-white/5"
        >
          {kind === "video" ? <Film className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
          Sube {kind === "video" ? "un video" : "una imagen"} para esta sección
        </button>
      ) : (
        <div className="group relative overflow-hidden rounded-md border border-border/40">
          {video ? (
            <video src={video} controls className="block h-auto w-full" />
          ) : (
            <img src={image} alt="" className="block h-auto w-full object-contain" />
          )}
          <button
            type="button"
            onClick={remove}
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 opacity-80 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
