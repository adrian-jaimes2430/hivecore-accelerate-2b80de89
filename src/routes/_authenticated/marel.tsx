import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Send, Sparkles, Trash2, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import marelAvatar from "@/assets/marel-avatar.png";
import { useAuth } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/levels";
import {
  deleteMarelThread,
  getMarelThread,
  listMarelThreads,
  sendMarelMessage,
  type MarelMessage,
} from "@/lib/marel.functions";

export const Route = createFileRoute("/_authenticated/marel")({
  component: MarelPage,
  head: () => ({
    meta: [
      { title: "Marel — asistente IA de HIVECORE" },
      {
        name: "description",
        content:
          "Marel te ayuda a entender la plataforma, compartir tus funnels y encontrar los productos con mejor comisión.",
      },
      { property: "og:title", content: "Marel — asistente IA de HIVECORE" },
      {
        property: "og:description",
        content: "Asistente interna para impulsadores NomadHive: proceso de impulso, pagos y mejores ganancias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SUGGESTIONS = [
  "¿Cómo funciona el proceso de impulso?",
  "¿Cuáles productos me dan más ganancia?",
  "¿Cómo comparto mi link con referido?",
  "¿Cómo y cuándo me pagan mi 20%?",
];

function MarelPage() {
  const { profile, level } = useAuth();
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useServerFn(listMarelThreads);
  const fetchThread = useServerFn(getMarelThread);
  const send = useServerFn(sendMarelMessage);
  const removeThread = useServerFn(deleteMarelThread);

  const { data: threadData } = useQuery({
    queryKey: ["marel-threads"],
    queryFn: () => fetchThreads(),
  });
  const threads = threadData?.threads ?? [];

  const { data: msgData, isLoading: loadingMessages } = useQuery({
    queryKey: ["marel-thread", threadId],
    enabled: !!threadId,
    queryFn: () => fetchThread({ data: { threadId: threadId! } }),
  });
  const messages: MarelMessage[] = msgData?.messages ?? [];

  const mutation = useMutation({
    mutationFn: (message: string) => send({ data: { threadId, message } }),
    onSuccess: async (res) => {
      setPending(null);
      setThreadId(res.threadId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["marel-thread", res.threadId] }),
        qc.invalidateQueries({ queryKey: ["marel-threads"] }),
      ]);
    },
    onError: (e: Error) => {
      setPending(null);
      toast.error(e.message || "Marel no pudo responder.");
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => removeThread({ data: { threadId: id } }),
    onSuccess: async (_r, id) => {
      if (id === threadId) setThreadId(null);
      await qc.invalidateQueries({ queryKey: ["marel-threads"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, mutation.isPending]);

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || mutation.isPending) return;
    setDraft("");
    setPending(message);
    mutation.mutate(message);
  };

  const empty = !threadId || (!loadingMessages && messages.length === 0 && !pending);
  const firstName = useMemo(() => profile?.full_name?.split(" ")[0] ?? "impulsador", [profile]);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6 md:py-10">
      {/* Hilos guardados */}
      <aside className="hidden w-64 shrink-0 md:block">
        <button
          onClick={() => setThreadId(null)}
          className="shop-btn-accent w-full justify-center"
        >
          <Plus className="h-4 w-4" /> Nuevo chat
        </button>
        <div className="mt-4 space-y-1">
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Conversaciones
          </p>
          {threads.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Aún no tienes conversaciones.</p>
          )}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-xl px-2 py-2 text-sm transition-colors ${
                t.id === threadId ? "bg-hive/12 text-foreground" : "hover:bg-white/5 text-muted-foreground"
              }`}
            >
              <button onClick={() => setThreadId(t.id)} className="flex-1 truncate text-left">
                {t.title}
              </button>
              <button
                onClick={() => del.mutate(t.id)}
                aria-label="Eliminar conversación"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex min-h-[70vh] flex-1 flex-col">
        <header className="flex items-center gap-3">
          <img
            src={marelAvatar}
            alt="Marel"
            width={512}
            height={512}
            className="h-11 w-11 rounded-full bg-hive/10 p-1"
          />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-[-0.02em]">Marel</h1>
            <p className="truncate text-xs text-muted-foreground">
              Asistente interna · nivel {LEVEL_LABEL[level]} · comisión 20%
            </p>
          </div>
          <div className="ml-auto flex gap-2 md:hidden">
            <button onClick={() => setThreadId(null)} className="shop-btn-accent px-3 py-2">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Hilos en móvil */}
        {threads.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setThreadId(t.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                  t.id === threadId
                    ? "border-hive/40 bg-hive/15 text-foreground"
                    : "border-border/60 bg-white/5 text-muted-foreground"
                }`}
              >
                <MessagesSquare className="mr-1 inline h-3 w-3" />
                {t.title.length > 22 ? `${t.title.slice(0, 22)}…` : t.title}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex-1 space-y-4">
          {empty && (
            <div className="shop-card p-6">
              <div className="inline-flex items-center gap-2 text-sm text-hive">
                <Sparkles className="h-4 w-4" /> Hola {firstName}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Soy Marel. Te explico cómo funciona la plataforma, el proceso de impulso, cómo compartir tus links
                con referido, cobros y pagos, y te ayudo a encontrar los productos con mejor ganancia.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-border/60 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-hive/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMessages && threadId && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-hive" />
            </div>
          )}

          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}

          {pending && <Bubble role="user" content={pending} />}
          {mutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <img src={marelAvatar} alt="" width={512} height={512} className="h-7 w-7 rounded-full bg-hive/10 p-0.5" />
              <span className="flex gap-1">
                <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
          className="sticky bottom-24 mt-4 flex items-end gap-2 rounded-2xl border border-border/60 bg-surface-elevated/90 p-2 backdrop-blur-xl md:bottom-6"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            rows={1}
            placeholder="Pregúntale a Marel…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !draft.trim()}
            className="shop-btn-accent px-3 py-2 disabled:opacity-50"
            aria-label="Enviar"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </section>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-hive"
      style={{ animationDelay: delay }}
    />
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const mine = role === "user";
  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (
        <img
          src={marelAvatar}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          className="mt-1 h-7 w-7 shrink-0 rounded-full bg-hive/10 p-0.5"
        />
      )}
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          mine
            ? "bg-hive/15 text-foreground"
            : "border border-border/50 bg-surface-elevated/70 text-foreground"
        }`}
      >
        {renderRich(content)}
      </div>
    </div>
  );
}

/** Formato enriquecido ligero: **negritas** y viñetas. */
function renderRich(text: string) {
  return text.split("\n").map((line, i) => {
    const bullet = /^\s*[-*]\s+/.test(line);
    const parts = line.replace(/^\s*[-*]\s+/, "").split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={bullet ? "flex gap-2" : undefined}>
        {bullet && <span className="text-hive">•</span>}
        <span>
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**") ? (
              <strong key={j} className="font-semibold">
                {p.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{p}</span>
            ),
          )}
        </span>
      </p>
    );
  });
}
