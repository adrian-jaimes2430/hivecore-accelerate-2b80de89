import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { askMarelGuest } from "@/lib/marel-public.functions";
import marelAvatar from "@/assets/marel-avatar.png";

const BubbleCanvas = lazy(() => import("./MarelBubble3DCanvas"));

interface Msg {
  role: "user" | "assistant";
  content: string;
  handoff?: { name: string; url: string } | null;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "¡Hola! Soy **Marel** ✨ Cuéntame qué buscas (perfume, reloj, joya, bolso…) y te digo precio, disponibilidad y cómo pedirlo.",
};

/**
 * Globo 3D flotante que abre el chat público con Marel. Si detecta intención
 * de compra, entrega el enlace de WhatsApp del impulsador del enlace (?ref=)
 * o del número oficial AnMa cuando el tráfico viene de anuncios.
 */
export function MarelChatBubble({ refId }: { refId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await askMarelGuest({
        data: {
          messages: next.filter((m) => m !== GREETING).map((m) => ({ role: m.role, content: m.content })),
          ref: refId ?? null,
        },
      });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply, handoff: res.handoff }]);
    } catch (error) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Algo falló, intenta de nuevo.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open && (
        <div className="marel-panel animate-scale-in">
          <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <img src={marelAvatar} alt="Marel" className="h-9 w-9 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Marel</p>
              <p className="text-[11px] text-muted-foreground">Asesora AnMa Luxury · en línea</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-[color:var(--luxury-gold)] px-3.5 py-2 text-sm text-black"
                      : "max-w-[92%] text-sm leading-relaxed text-foreground"
                  }
                >
                  <Rich text={m.content} />
                  {m.handoff && (
                    <a
                      href={m.handoff.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-105"
                    >
                      <MessageCircle className="h-4 w-4" /> Continuar con {m.handoff.name.split(" ")[0]}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Marel está escribiendo…
              </p>
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-white/10 p-3">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Escríbele a Marel…"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-[color:var(--luxury-gold)]/50"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--luxury-gold)] text-black disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="marel-bubble-btn"
        aria-label={open ? "Cerrar chat con Marel" : "Hablar con Marel"}
      >
        <ClientOnly fallback={<MessageCircle className="h-6 w-6 text-black" />}>
          <Suspense fallback={<MessageCircle className="h-6 w-6 text-black" />}>
            <BubbleCanvas />
          </Suspense>
        </ClientOnly>
      </button>
    </>
  );
}

/** Render mínimo de markdown (negritas y listas) sin dependencias. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-*]\s+/.test(line);
        const content = line.replace(/^\s*[-*]\s+/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
          seg.startsWith("**") && seg.endsWith("**") ? <strong key={j}>{seg.slice(2, -2)}</strong> : <span key={j}>{seg}</span>,
        );
        if (!content.trim()) return <span key={i} className="block h-2" />;
        return (
          <p key={i} className={bullet ? "flex gap-2" : ""}>
            {bullet && <span className="text-[color:var(--luxury-gold)]">•</span>}
            <span>{parts}</span>
          </p>
        );
      })}
    </>
  );
}
