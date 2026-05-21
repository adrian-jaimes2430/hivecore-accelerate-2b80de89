import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Share2, Mail, MessageCircle, Link as LinkIcon, ShoppingBag, ArrowLeft, Lock, Loader2 } from "lucide-react";
import { sendOrderNotification } from "@/lib/order-email.functions";

export const Route = createFileRoute("/product/$slug")({
  component: ProductFunnel,
});

interface FunnelSection { title: string; content: string; image?: string }
interface Product {
  id: string; slug: string; sku: string; name: string; price: number; upsell_price: number | null;
  short_description: string | null; description: string | null;
  benefits: unknown; images: unknown; funnel_sections: unknown; cta_label: string | null;
}

function ProductFunnel() {
  const { slug } = Route.useParams();
  const { user, profile } = useAuth();
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

  const funnel = Array.isArray(product.funnel_sections)
    ? (product.funnel_sections as FunnelSection[]).filter((s) => s.title || s.content || s.image)
    : [];

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

      {/* Dynamic funnel sections — continuous, no titles */}
      {funnel.length > 0 && (
        <div className="mx-auto max-w-3xl px-0 sm:px-6 mt-6">
          {funnel.map((s, i) => {
            const imageOnly = Boolean(s.image && !s.content?.trim());
            return imageOnly ? (
              <img key={i} src={s.image} alt={product.name} className="block h-auto w-full object-contain" />
            ) : (
              <section key={i} className="px-4 py-8 sm:px-0">
                {s.image && (
                  <img src={s.image} alt={product.name} className="mb-6 block h-auto w-full object-contain" />
                )}
                {s.content && (
                  <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{s.content}</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Final order section — minimal product data + CTA */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="hive-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border/40">
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-32">Producto</td>
                <td className="px-4 py-3 font-medium">{product.name}</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">SKU</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-hive">{product.sku}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Precio</td>
                <td className="px-4 py-3">
                  <span className="font-display text-2xl font-bold hive-gradient-text">S/ {Number(product.price).toFixed(2)}</span>
                  {product.upsell_price && (
                    <span className="ml-2 text-sm text-muted-foreground line-through">S/ {Number(product.upsell_price).toFixed(2)}</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {user ? <OrderDialog product={product} impulsadorName={profile?.full_name ?? null} /> : <LoginCTA />}
          <ShareDialog product={product} />
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

function OrderDialog({ product, impulsadorName }: { product: Product; impulsadorName: string | null }) {
  const { user } = useAuth();
  const sendEmail = useServerFn(sendOrderNotification);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [form, setForm] = useState({ client_name: "", client_phone: "", client_address: "", quantity: 1, notes: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const total = Number(product.price) * form.quantity;
    const { data, error } = await supabase.from("orders").insert({
      impulsador_id: user.id,
      product_id: product.id,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_address: form.client_address,
      quantity: form.quantity,
      notes: form.notes,
      total,
    }).select("order_code").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setCode(data!.order_code);
    toast.success("Pedido creado");

    // Fire-and-forget email notification
    sendEmail({
      data: {
        orderCode: data!.order_code,
        productName: product.name,
        productSku: product.sku,
        clientName: form.client_name,
        clientPhone: form.client_phone,
        clientAddress: form.client_address || null,
        quantity: form.quantity,
        total,
        notes: form.notes || null,
        impulsadorName: impulsadorName,
      },
    }).catch((err) => console.warn("[order-email]", err));
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
