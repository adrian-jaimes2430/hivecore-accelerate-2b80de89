import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Share2, Mail, MessageCircle, Link as LinkIcon, ShoppingBag, Flame, ArrowLeft, Lock, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/product/$slug")({
  component: ProductFunnel,
});

interface FunnelSection { title: string; content: string; image?: string }
interface Product {
  id: string; slug: string; name: string; price: number; upsell_price: number | null;
  short_description: string | null; description: string | null;
  benefits: unknown; images: unknown; funnel_sections: unknown; cta_label: string | null;
}

function ProductFunnel() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Product;
    },
  });

  if (isLoading || !product) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-hive" /></div>;
  }
  const benefits = Array.isArray(product.benefits) ? product.benefits as string[] : [];
  const images = Array.isArray(product.images) ? product.images as string[] : [];
  const funnel = Array.isArray(product.funnel_sections)
    ? (product.funnel_sections as FunnelSection[]).filter((s) => s.title || s.content || s.image)
    : [];
  const heroImage = funnel.find((s) => s.image)?.image ?? images[0];

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {user ? (
          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Funnel público HIVECORE
          </div>
        )}
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden pt-8">
        <div className="absolute inset-0 bg-gradient-to-b from-hive/10 via-transparent to-transparent" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <div className="relative">
            <div className="hive-gradient-border relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-hive/30 via-ao-red/10 to-anma-orange/20">
              <div className="absolute inset-0 hive-grid-bg opacity-40" />
              {heroImage ? (
                <img src={heroImage} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-[140px] font-black opacity-25">{product.name.charAt(0)}</span>
                </div>
              )}
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ao-red/90 px-3 py-1 text-xs font-bold text-white">
                <Flame className="h-3 w-3" /> OFERTA LIMITADA
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium uppercase tracking-wider text-hive">Premium · A&O Ecosystem</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-tight sm:text-6xl">{product.name}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{product.short_description}</p>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-5xl font-bold hive-gradient-text">S/ {Number(product.price).toFixed(2)}</span>
              {product.upsell_price && (
                <span className="mb-1 text-lg text-muted-foreground line-through">S/ {Number(product.upsell_price).toFixed(2)}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-anma-orange">⚡ Solo quedan pocas unidades disponibles</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? <OrderDialog product={product} /> : <LoginCTA />}
              <ShareDialog product={product} />
            </div>
          </div>
        </div>
      </section>

      {benefits.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-sm font-medium uppercase tracking-wider text-hive">Beneficios</p>
          <h2 className="mt-2 font-display text-4xl font-bold">¿Por qué elegir {product.name}?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <div key={i} className="hive-card flex items-start gap-3 p-5">
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hive/15 text-hive">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-sm">{b}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic funnel sections from admin */}
      {funnel.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-16 py-8">
          {funnel.map((s, i) => (
            <section key={i} className={`grid gap-8 items-center ${s.image ? "lg:grid-cols-2" : ""}`}>
              {s.image && (
                <div className={`${i % 2 === 1 ? "lg:order-2" : ""} overflow-hidden rounded-2xl hive-gradient-border`}>
                  <img src={s.image} alt={s.title} className="w-full h-auto object-cover" />
                </div>
              )}
              <div>
                {s.title && <h2 className="font-display text-3xl sm:text-4xl font-bold">{s.title}</h2>}
                {s.content && <p className="mt-4 text-lg leading-relaxed text-muted-foreground whitespace-pre-line">{s.content}</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Story */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <Sparkles className="mx-auto h-8 w-8 text-anma-orange" />
        <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">La historia detrás de {product.name}</h2>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{product.description}</p>
      </section>

      {/* Scarcity / Offer */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="hive-card hive-gradient-border overflow-hidden p-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-ao-red">Oferta exclusiva</p>
          <h2 className="mt-2 font-display text-4xl font-bold">Esta semana únicamente</h2>
          <p className="mt-3 text-muted-foreground">Precio especial para impulsadores HIVECORE.</p>
          <div className="mt-6 flex items-end justify-center gap-3">
            <span className="font-display text-6xl font-bold hive-gradient-text">S/ {Number(product.price).toFixed(2)}</span>
            {product.upsell_price && (
              <span className="mb-2 text-xl text-muted-foreground line-through">S/ {Number(product.upsell_price).toFixed(2)}</span>
            )}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {user ? <OrderDialog product={product} /> : <LoginCTA />}
            <ShareDialog product={product} />
          </div>
        </div>
      </section>
    </div>
  );
}

function LoginCTA() {
  return (
    <Button disabled className="h-12 border border-border/60 bg-white/5 px-6 text-base text-muted-foreground opacity-100">
      <Lock className="mr-2 h-4 w-4" /> Pedido gestionado por tu impulsador
    </Button>
  );
}

function OrderDialog({ product }: { product: Product }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [form, setForm] = useState({ client_name: "", client_phone: "", client_address: "", quantity: 1, notes: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.from("orders").insert({
      impulsador_id: user.id,
      product_id: product.id,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_address: form.client_address,
      quantity: form.quantity,
      notes: form.notes,
      total: Number(product.price) * form.quantity,
    }).select("order_code").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setCode(data!.order_code);
    toast.success("Pedido creado");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCode(null); }}>
      <DialogTrigger asChild>
        <Button className="hive-btn-primary h-12 border-0 px-6 text-base">
          <ShoppingBag className="mr-2 h-4 w-4" /> {product.cta_label ?? "Pedir ahora"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-elevated border-border/60">
        <DialogHeader><DialogTitle>Nuevo pedido · {product.name}</DialogTitle></DialogHeader>
        {code ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-hive/15 text-hive">
              <Check className="h-6 w-6" />
            </div>
            <p>Pedido generado con código:</p>
            <p className="font-display text-3xl font-bold hive-gradient-text">{code}</p>
            <Button onClick={() => setOpen(false)} className="hive-btn-primary border-0">Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nombre cliente</Label>
              <Input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="bg-white/5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Teléfono</Label>
                <Input required value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className="bg-white/5" />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="bg-white/5" />
              </div>
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="bg-white/5" />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-white/5" />
            </div>
            <Button type="submit" disabled={busy} className="hive-btn-primary w-full border-0 h-11">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar pedido"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ product }: { product: Product }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : "";
  const msg = `🔥 ${product.name} — ${product.short_description ?? ""}\n${url}`;
  const copy = async () => { await navigator.clipboard.writeText(url); toast.success("Enlace copiado"); };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-12 border border-border/60 bg-white/5 px-6 text-base">
          <Share2 className="mr-2 h-4 w-4" /> Compartir
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-elevated border-border/60">
        <DialogHeader><DialogTitle>Compartir {product.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} className="hive-card flex flex-col items-center gap-2 p-4 text-center text-sm hover:border-hive/40">
            <MessageCircle className="h-6 w-6 text-hive" /> WhatsApp
          </a>
          <a href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(msg)}`} className="hive-card flex flex-col items-center gap-2 p-4 text-center text-sm hover:border-hive/40">
            <Mail className="h-6 w-6 text-anma-orange" /> Email
          </a>
          <button onClick={copy} className="hive-card flex flex-col items-center gap-2 p-4 text-center text-sm hover:border-hive/40">
            <LinkIcon className="h-6 w-6 text-ao-red" /> Copiar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
