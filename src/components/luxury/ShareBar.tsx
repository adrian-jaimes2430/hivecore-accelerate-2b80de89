import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, MessageCircle, Mail, Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  url: string;
  title: string;
  text?: string;
}

export function ShareBar({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);
  const message = `${title}${text ? ` — ${text}` : ""}\n${url}`;

  const native = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await copy();
      }
    } catch { /* user cancelled */ }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={native} className="hive-btn-primary h-9">
        <Share2 className="mr-1.5 h-4 w-4" /> Compartir
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm text-emerald-400 hover:bg-emerald-500/20"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 px-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
      >
        <Mail className="h-4 w-4" /> Email
      </a>
      <Button size="sm" variant="ghost" onClick={copy} className="h-9 border border-border/60">
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <LinkIcon className="h-4 w-4" />}
        <span className="ml-1.5">{copied ? "Copiado" : "Copiar"}</span>
      </Button>
    </div>
  );
}
