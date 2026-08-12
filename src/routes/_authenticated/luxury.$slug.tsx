import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Crown, Loader2, ExternalLink, ShoppingBag, Check } from "lucide-react";
import { ShareBar } from "@/components/luxury/ShareBar";
import { MediaGallery, buildMedia } from "@/components/luxury/MediaGallery";
import { VariationPicker, summarizeVariations } from "@/components/luxury/VariationPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendOrderNotification } from "@/lib/order-email.functions";
import { forwardOrderToIntegrations } from "@/lib/integrations.functions";
import type { Variation } from "@/components/admin/VariationsEditor";
import { formatCOP } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/luxury/$slug")({
  component: LuxuryProduct,
});

interface LuxProduct {
  id: string; sku: string | null; name: string; slug: string;
  short_description: string | null; description: string | null;
  images: unknown; videos: unknown; variations: unknown;
  category_id: string | null; brand_id: string | null;
  price: number; suggested_retail_price: number;
  show_impulsador_price: boolean;
  stock_status: string; stock_quantity: number;
  attributes: Record<string, unknown>;
}

function LuxuryProduct() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const SITE_URL = "https://hivecore-accelerate.lovable.app";

  const { data: product, isLoading } = useQuery({
    queryKey: ["luxury-product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("luxury_products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data as LuxProduct | null;
    },
  });

  const { data: brand } = useQuery({
    queryKey: ["luxury-brand", product?.brand_id],
    enabled: !!product?.brand_id,
    queryFn: async () => {
      const { data } = await supabase.from("luxury_brands").select("name").eq("id", product!.brand_id!).maybeSingle();
      return data as { name: string } | null;
    },
  });

  if (isLoading) return <div className="flex h-60 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[color:var(--luxury-gold)]" /></div>;
  if (!product) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Producto no encontrado.</div>;

  const media = buildMedia(product.images, product.videos);
  const variations: Variation[] = Array.isArray(product.variations) ? (product.variations as Variation[]) : [];
  const utility = Number(product.suggested_retail_price) - Number(product.price);
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  const showImp = product.show_impulsador_price !== false;

  const publicUrl = user ? `${SITE_URL}/catalogo/${product.slug}?ref=${user.id}` : `${SITE_URL}/catalogo/${product.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/luxury" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> AnMa Luxury Collection
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="animate-fade-up">
          <MediaGallery media={media} fallbackInitial={product.name.charAt(0)} />
        </div>

        <div className="space-y-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--luxury-gold)]/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Luxury
            </div>
            {brand && <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{brand.name}</p>}
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
            {product.sku && <p className="mt-1 text-xs text-muted-foreground">SKU: {product.sku}</p>}
          </div>

          {product.short_description && <p className="text-muted-foreground">{product.short_description}</p>}

          <div className="shop-panel">
            {showImp ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="shop-price text-3xl">{formatCOP(Number(product.price))}</span>
                  <span className="text-xs text-muted-foreground">precio impulsador</span>
                </div>
                {product.suggested_retail_price > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">Precio sugerido al cliente: <span className="text-foreground">{formatCOP(Number(product.suggested_retail_price))}</span></p>
                )}
                {utility > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-hive/40 bg-hive/10 px-3 py-1 text-sm font-medium text-hive">
                    Utilidad estimada: +{formatCOP(utility)}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="shop-price text-3xl">{formatCOP(Number(product.suggested_retail_price || product.price))}</span>
                <span className="text-xs text-muted-foreground">precio final</span>
              </div>
            )}
          </div>

          {variations.length > 0 && (
            <div className="shop-panel">
              <VariationPicker variations={variations} value={selectedVariations} onChange={setSelectedVariations} />
            </div>
          )}


          <div className="space-y-2">
            <StockBadge status={product.stock_status} qty={product.stock_quantity} />
            {user && <LuxuryOrderDialog product={product} selectedVariations={selectedVariations} />}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Compartir con clientes</p>
            <ShareBar url={publicUrl} title={product.name} text={product.short_description ?? undefined} />
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[color:var(--luxury-gold)] hover:underline">
              <ExternalLink className="h-3 w-3" /> Ver ficha pública
            </a>
          </div>

          {product.description && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Descripción</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {Object.keys(attrs).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Atributos</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(attrs).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                    <dt className="text-muted-foreground capitalize">{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StockBadge({ status, qty }: { status: string; qty: number }) {
  const map: Record<string, { l: string; c: string }> = {
    in_stock: { l: `En stock${qty ? ` (${qty})` : ""}`, c: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
    low_stock: { l: "Pocas unidades", c: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
    out_of_stock: { l: "Agotado", c: "border-red-500/40 text-red-400 bg-red-500/10" },
    preorder: { l: "Pre-orden", c: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
  };
  const s = map[status] ?? map.in_stock;
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${s.c}`}>{s.l}</span>;
}

function LuxuryOrderDialog({ product, selectedVariations }: { product: LuxProduct; selectedVariations: Record<string, string> }) {
  const { user } = useAuth();
  const sendEmail = useServerFn(sendOrderNotification);
  const forwardOrder = useServerFn(forwardOrderToIntegrations);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [form, setForm] = useState({ client_name: "", client_phone: "", client_email: "", client_address: "", client_city: "", client_region: "", quantity: 1, notes: "" });
  const variantSummary = summarizeVariations(selectedVariations);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const unitPrice = Number(product.suggested_retail_price) > 0 ? Number(product.suggested_retail_price) : Number(product.price);
    const total = unitPrice * form.quantity;
    const fullNotes = [variantSummary && `Opciones: ${variantSummary}`, form.notes].filter(Boolean).join("\n");
    const { data, error } = await supabase.from("orders").insert({
      impulsador_id: user.id,
      luxury_product_id: product.id,
      product_id: null,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_address: form.client_address,
      client_city: form.client_city,
      client_region: form.client_region,
      client_email: form.client_email,

      quantity: form.quantity,
      notes: fullNotes,
      total,
    } as never).select("id, order_code").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    const created = data as { id: string; order_code: string };
    setCode(created.order_code);
    toast.success("Pedido creado");
    forwardOrder({ data: { orderId: created.id } }).catch((err) => console.warn("[order-forward]", err));
    sendEmail({
      data: {
        orderCode: (data as { order_code: string }).order_code,
        productName: product.name + (variantSummary ? ` (${variantSummary})` : ""),
        productSku: product.sku ?? "",
        clientName: form.client_name,
        clientPhone: form.client_phone,
        clientAddress: form.client_address || null,
        quantity: form.quantity,
        total,
        notes: fullNotes || null,
        impulsadorName: null,
      },
    }).catch((err) => console.warn("[luxury-order-email]", err));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCode(null); }}>
      <DialogTrigger asChild>
        <Button className="shop-btn-accent h-12 w-full border-0 text-base hover:opacity-100">
          <ShoppingBag className="mr-2 h-4 w-4" /> Crear pedido
        </Button>

      </DialogTrigger>
      <DialogContent className="bg-surface-elevated border-border/60">
        <DialogHeader><DialogTitle>Nuevo pedido · {product.name}</DialogTitle></DialogHeader>
        {code ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--luxury-gold)]/15 text-[color:var(--luxury-gold)]">
              <Check className="h-6 w-6" />
            </div>
            <p>Pedido generado con código:</p>
            <p className="font-display text-3xl font-bold luxury-gradient-text">{code}</p>
            <Button onClick={() => setOpen(false)} className="border-0 bg-[color:var(--luxury-gold)] text-black hover:opacity-90">Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {variantSummary && (
              <p className="rounded-md border border-[color:var(--luxury-gold)]/30 bg-[color:var(--luxury-gold)]/5 px-3 py-2 text-xs text-[color:var(--luxury-gold)]">
                Variación: {variantSummary}
              </p>
            )}
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
              <Label>Correo electrónico</Label>
              <Input type="email" required maxLength={180} value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="bg-white/5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciudad</Label>
                <Input required minLength={2} value={form.client_city} onChange={(e) => setForm({ ...form, client_city: e.target.value })} className="bg-white/5" />
              </div>
              <div>
                <Label>Departamento / Región</Label>
                <Input required minLength={2} value={form.client_region} onChange={(e) => setForm({ ...form, client_region: e.target.value })} className="bg-white/5" />
              </div>
            </div>
            <div>
              <Label>Dirección de entrega (barrio, calle, número)</Label>
              <Input required minLength={4} value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="bg-white/5" />
            </div>

            <div>
              <Label>Observaciones</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-white/5" />
            </div>
            <Button type="submit" disabled={busy} className="shop-btn-accent h-12 w-full border-0 text-base hover:opacity-100">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar pedido"}
            </Button>

          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
