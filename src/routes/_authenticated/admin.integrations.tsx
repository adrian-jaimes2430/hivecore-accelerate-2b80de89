import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { testIntegration } from "@/lib/integrations.functions";
import {
  getNotificationSettings,
  saveNotificationSettings,
  detectTelegramChat,
  sendTestOrderAlert,
} from "@/lib/notifications.functions";
import {
  Plug, Plus, Copy, RefreshCw, Trash2, Play, Loader2, ArrowLeft,
  CheckCircle2, XCircle, Eye, EyeOff, Webhook, KeyRound, Bell, Send, Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  component: IntegrationsPage,
  head: () => ({ meta: [{ title: "Integraciones — HIVECORE" }] }),
});

interface Integration {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  webhook_url: string;
  is_active: boolean;
  orders_sent: number;
  last_sent_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
}

function IntegrationsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runTest = useServerFn(testIntegration);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/app" });
  }, [loading, isAdmin, navigate]);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("integrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Integration[];
    },
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", webhook_url: "" });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["integrations"] });

  const createOne = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.webhook_url.trim()) return;
    setBusy(true);
    const { error } = await (supabase as any).from("integrations").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      webhook_url: form.webhook_url.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Integración creada. Copia la clave y pégala en A&O CORE OS.");
    setForm({ name: "", description: "", webhook_url: "" });
    setCreating(false);
    invalidate();
  };

  const toggleActive = async (i: Integration, v: boolean) => {
    const { error } = await (supabase as any).from("integrations").update({ is_active: v }).eq("id", i.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const rotateKey = async (i: Integration) => {
    if (!confirm(`Regenerar clave para "${i.name}"? La clave anterior dejará de funcionar.`)) return;
    // Postgres will regenerate the DEFAULT via a direct update to NULL then to new value.
    const newKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await (supabase as any).from("integrations").update({ api_key: newKey }).eq("id", i.id);
    if (error) return toast.error(error.message);
    toast.success("Nueva clave generada");
    invalidate();
  };

  const removeOne = async (i: Integration) => {
    if (!confirm(`Eliminar integración "${i.name}"?`)) return;
    const { error } = await (supabase as any).from("integrations").delete().eq("id", i.id);
    if (error) return toast.error(error.message);
    toast.success("Integración eliminada");
    invalidate();
  };

  const runTestFor = async (i: Integration) => {
    setTesting(i.id);
    try {
      const r = await runTest({ data: { integrationId: i.id } });
      if (r.ok) toast.success(`Prueba OK (${r.status})`);
      else toast.error(`Falla ${r.status}: ${r.message?.slice(0, 120) || "sin respuesta"}`);
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setTesting(null);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (loading || !isAdmin) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-hive/15 p-2.5"><Plug className="h-6 w-6 text-hive" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold">Integraciones</h1>
            <p className="text-sm text-muted-foreground">Envía automáticamente cada pedido de HIVECORE a sistemas externos como A&O CORE OS.</p>
          </div>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="border-0 bg-hive text-white hover:bg-hive/90"><Plus className="mr-2 h-4 w-4" /> Nueva integración</Button>
          </DialogTrigger>
          <DialogContent className="bg-surface-elevated border-border/60">
            <DialogHeader><DialogTitle>Nueva integración</DialogTitle></DialogHeader>
            <form onSubmit={createOne} className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input required placeholder="A&O CORE OS" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5" />
              </div>
              <div>
                <Label>URL del webhook (del sistema externo)</Label>
                <Input required type="url" placeholder="https://coreos.ayoecosystem.com/api/webhooks/hivecore" value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} className="bg-white/5" />
                <p className="mt-1 text-xs text-muted-foreground">A&O CORE OS te da esta URL. HIVECORE hará POST allí cada vez que se cree un pedido.</p>
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea placeholder="Notas internas..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy} className="border-0 bg-hive text-white hover:bg-hive/90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <NotificationsPanel />

      {/* Docs card */}
      <div className="hive-card mb-6 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Webhook className="h-4 w-4 text-hive" /> Cómo funciona
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Crea una integración con la URL del webhook que te da A&O CORE OS.</li>
          <li>Copia la <b>Clave de API</b> y pégala como <code>Bearer token</code> en A&O CORE OS.</li>
          <li>Cada vez que un impulsador cree un pedido en HIVECORE, se enviará un POST JSON al webhook con los datos del pedido, producto e impulsador (id, nombre, <b>email</b>, teléfono).</li>
          <li>A&O CORE OS usa el <b>email</b> del impulsador para asignarle el pedido en su sistema.</li>
          <li>Puedes pausar, regenerar la clave o probar la conexión en cualquier momento.</li>
        </ol>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>
      ) : integrations.length === 0 ? (
        <div className="hive-card p-12 text-center">
          <Plug className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Aún no hay integraciones. Crea la primera para conectar A&O CORE OS.</p>
          <Button onClick={() => setCreating(true)} className="border-0 bg-hive text-white hover:bg-hive/90">
            <Plus className="mr-2 h-4 w-4" /> Nueva integración
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((i) => (
            <div key={i.id} className="hive-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold">{i.name}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${i.is_active ? "bg-green-500/15 text-green-400" : "bg-white/10 text-muted-foreground"}`}>
                      {i.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {i.is_active ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  {i.description && <p className="mt-1 text-xs text-muted-foreground">{i.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={i.is_active} onCheckedChange={(v) => toggleActive(i, v)} />
                  <Button size="sm" variant="ghost" onClick={() => runTestFor(i)} disabled={testing === i.id} className="border border-border/60">
                    {testing === i.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                    Probar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => rotateKey(i)} className="border border-border/60">
                    <RefreshCw className="mr-1 h-3 w-3" /> Regenerar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeOne(i)} className="border border-red-500/40 text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                    <Webhook className="h-3 w-3" /> URL del webhook
                  </Label>
                  <div className="flex items-center gap-2 rounded-md border border-border/40 bg-black/30 px-2 py-1.5">
                    <code className="flex-1 truncate font-mono text-xs">{i.webhook_url}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(i.webhook_url, "URL")} className="h-6 px-1.5">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                    <KeyRound className="h-3 w-3" /> Clave de API (Bearer)
                  </Label>
                  <div className="flex items-center gap-2 rounded-md border border-border/40 bg-black/30 px-2 py-1.5">
                    <code className="flex-1 truncate font-mono text-xs">
                      {reveal[i.id] ? i.api_key : "•".repeat(Math.min(32, i.api_key.length))}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => setReveal((r) => ({ ...r, [i.id]: !r[i.id] }))} className="h-6 px-1.5">
                      {reveal[i.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copy(i.api_key, "Clave")} className="h-6 px-1.5">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Pedidos enviados</div>
                  <div className="mt-0.5 font-display text-xl font-bold text-hive">{i.orders_sent}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Último envío</div>
                  <div className="mt-0.5">{i.last_sent_at ? new Date(i.last_sent_at).toLocaleString() : "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Estado</div>
                  <div className={`mt-0.5 ${i.last_error ? "text-red-400" : "text-green-400"}`}>{i.last_status ?? "—"}</div>
                </div>
              </div>
              {i.last_error && (
                <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                  <b>Último error:</b> {i.last_error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
