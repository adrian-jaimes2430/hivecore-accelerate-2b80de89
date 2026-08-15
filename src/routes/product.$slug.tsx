import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { validateCheckoutFields, checkoutErrorSummary, type CheckoutFieldErrors } from "@/lib/checkout-validation";
import { FieldError, errorRing } from "@/components/checkout/FieldError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Share2, Mail, MessageCircle, Link as LinkIcon, ShoppingBag, ArrowLeft, Lock, Loader2 } from "lucide-react";
import { sendOrderNotification } from "@/lib/order-email.functions";
import { forwardOrderToIntegrations } from "@/lib/integrations.functions";
import { getProductPublic } from "@/lib/product-public.functions";
import { getImpulsadorRef } from "@/lib/luxury-public.functions";
import { WhatsAppFab } from "@/components/marketing/WhatsAppFab";
import { AutoVideo } from "@/components/marketing/AutoVideo";

import { productInquiryMessage, ANMA_WHATSAPP } from "@/lib/whatsapp";
import { PublicCheckoutDialog } from "@/components/checkout/PublicCheckoutDialog";
import { MetaPixel, MetaViewContent } from "@/components/marketing/MetaPixel";
import { bundleTotal, formatCOP} from "@/lib/pricing";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

const SITE_URL = "https://hivecore-accelerate.lovable.app";

const searchSchema = z.object({
  ref: fallback(z.string().optional(), undefined).optional(),
});

export const Route = createFileRoute("/product/$slug")({
  validateSearch: zodValidator(searchSchema),
  component: ProductFunnel,
  loader: async ({ params }) => {
    const product = await getProductPublic({ data: { slug: params.slug } });
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) => {
    const p: any = (loaderData as any)?.product;
    if (!p) return { meta: [{ title: "Producto — HIVECORE" }] };
    const imgs = Array.isArray(p.images) ? p.images : [];
    const cover = imgs[0];
    const title = `${p.name} — HIVECORE`;
    const desc = p.short_description || (p.description ? String(p.description).slice(0, 160) : `Conoce ${p.name} en HIVECORE.`);
    const url = `${SITE_URL}/product/${params.slug}`;
    const meta: any[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: p.name },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
      { name: "twitter:title", content: p.name },
      { name: "twitter:description", content: desc },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (cover) {
      meta.push({ property: "og:image", content: cover });
      meta.push({ name: "twitter:image", content: cover });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
});


interface FunnelSection { title: string; content: string; image?: string; video?: string }
interface Product {
  id: string; slug: string; sku: string; name: string; price: number; upsell_price: number | null;
  bundle_pricing_enabled?: boolean | null; price_2?: number | null; price_3?: number | null;
  short_description: string | null; description: string | null;
  benefits: unknown; images: unknown; funnel_sections: unknown; cta_label: string | null;
  meta_pixel_enabled?: boolean | null; meta_pixel_id?: string | null; meta_test_event_code?: string | null;
}


function ProductFunnel() {
  const { slug } = Route.useParams();
  const { ref } = Route.useSearch();
  const { product: initial } = Route.useLoaderData();
  const { user, profile } = useAuth();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    initialData: initial as Product,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Product;
    },
  });



  const { data: impulsador } = useQuery({
    queryKey: ["impulsador-ref", ref],
    enabled: !!ref,
    queryFn: () => getImpulsadorRef({ data: { ref: ref! } }),
  });

  if (isLoading || !product) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-hive" /></div>;
  }

  const funnel = Array.isArray(product.funnel_sections)
    ? (product.funnel_sections as FunnelSection[]).filter((s) => s.title || s.content || s.image || s.video)
    : [];

  return (
    <div>
      {product.meta_pixel_enabled && product.meta_pixel_id ? (
        <MetaPixel
          paid={!ref}
          pixelId={product.meta_pixel_id}
          testEventCode={product.meta_test_event_code}
          contentId={product.sku}
          contentName={product.name}
          value={Number(product.price)}
        />
      ) : (
        <MetaViewContent
          contentId={product.slug}
          contentName={product.name}
          value={Number(product.price)}
          paid={!ref}
        />
      )}
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
            const mediaOnly = Boolean((s.image || s.video) && !s.content?.trim());
            const media = s.video ? (
              <AutoVideo key={`v-${i}`} src={s.video} poster={s.image} eager={i < 1} className="block h-auto w-full object-contain" />

            ) : s.image ? (
              <img key={`i-${i}`} src={s.image} alt={`${product.name} — sección ${i + 1}`} loading={i < 1 ? "eager" : "lazy"} decoding="async" fetchPriority={i < 1 ? "high" : "low"} className="block h-auto w-full object-contain" />
            ) : null;
            return mediaOnly ? (
              <div key={i}>{media}</div>
            ) : (
              <section key={i} className="px-4 py-8 sm:px-0">
                {media && <div className="mb-6">{media}</div>}
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
        <div className="shop-card overflow-hidden p-0">
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
                  <span className="font-display text-2xl font-bold hive-gradient-text">{formatCOP(Number(product.price))}</span>
                  {product.upsell_price && (
                    <span className="ml-2 text-sm text-muted-foreground line-through">{formatCOP(Number(product.upsell_price))}</span>
                  )}
                  {product.bundle_pricing_enabled && (Number(product.price_2) > 0 || Number(product.price_3) > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {Number(product.price_2) > 0 && (
                        <span className="rounded-full bg-hive/15 px-2 py-0.5 font-semibold text-hive">
                          2 unidades · {formatCOP(Number(product.price_2))}
                        </span>
                      )}
                      {Number(product.price_3) > 0 && (
                        <span className="rounded-full bg-hive/15 px-2 py-0.5 font-semibold text-hive">
                          3 unidades · {formatCOP(Number(product.price_3))}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {user && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <OrderDialog product={product} impulsadorName={profile?.full_name ?? null} />
            <ShareDialog product={product} impulsadorId={user.id} />
          </div>
        )}
      </section>

      {!user && (
        <>
          {/* Espacio para que la barra flotante no tape el contenido final */}
          <div className="h-28" aria-hidden />
          <div className="cta-dock">
            <PublicCheckoutDialog
              productKind="funnel"
              slug={product.slug}
              productName={product.name}
              unitPrice={Number(product.price)}
              pricing={{
                price: Number(product.price),
                bundle_pricing_enabled: product.bundle_pricing_enabled ?? false,
                price_2: product.price_2 ?? null,
                price_3: product.price_3 ?? null,
              }}
              ctaLabel="¡Compra ahora, paga en casa!"
              ref={ref ?? null}
              triggerClassName="cta-3d"
            />
          </div>
          <WhatsAppFab phone={impulsador?.phone ?? ANMA_WHATSAPP} message={productInquiryMessage(product.name)} />
        </>
      )}
    </div>
  );
}




function OrderDialog({ product, impulsadorName }: { product: Product; impulsadorName: string | null }) {
  const { user } = useAuth();
  const sendEmail = useServerFn(sendOrderNotification);
  const forwardOrder = useServerFn(forwardOrderToIntegrations);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [form, setForm] = useState({ client_name: "", client_phone: "", client_email: "", client_address: "", client_city: "", client_region: "", quantity: 1, notes: "" });
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const found = validateCheckoutFields(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error(checkoutErrorSummary(found));
      return;
    }
    setBusy(true);
    const total = bundleTotal(
      {
        price: Number(product.price),
        bundle_pricing_enabled: product.bundle_pricing_enabled ?? false,
        price_2: product.price_2 ?? null,
        price_3: product.price_3 ?? null,
      },
      form.quantity,
    );
    const { data, error } = await supabase.from("orders").insert({
      impulsador_id: user.id,
      product_id: product.id,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_address: form.client_address,
      client_city: form.client_city,
      client_region: form.client_region,
      client_email: form.client_email,

      quantity: form.quantity,
      notes: form.notes,
      total,
    }).select("id, order_code").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setCode(data!.order_code);
    toast.success("Pedido creado");

    forwardOrder({ data: { orderId: data!.id } }).catch((err) => console.warn("[order-forward]", err));

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
          <form onSubmit={submit} noValidate className="space-y-3">
            <div>
              <Label>Nombres y apellidos completos del cliente</Label>
              <Input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={`bg-white/5${errorRing(errors.client_name)}`} />
              <FieldError message={errors.client_name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Teléfono</Label>
                <Input required value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className={`bg-white/5${errorRing(errors.client_phone)}`} />
              <FieldError message={errors.client_phone} />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="bg-white/5" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-white/5 px-3 py-2 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="font-display text-lg font-bold hive-gradient-text">
                {formatCOP(bundleTotal(
                  {
                    price: Number(product.price),
                    bundle_pricing_enabled: product.bundle_pricing_enabled ?? false,
                    price_2: product.price_2 ?? null,
                    price_3: product.price_3 ?? null,
                  },
                  form.quantity,
                ))}
              </span>
            </div>
            <div>
              <Label>Correo electrónico</Label>
              <Input type="email" required maxLength={180} value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className={`bg-white/5${errorRing(errors.client_email)}`} />
              <FieldError message={errors.client_email} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciudad</Label>
                <Input required minLength={2} value={form.client_city} onChange={(e) => setForm({ ...form, client_city: e.target.value })} className={`bg-white/5${errorRing(errors.client_city)}`} />
              <FieldError message={errors.client_city} />
              </div>
              <div>
                <Label>Departamento / Región</Label>
                <Input required minLength={2} value={form.client_region} onChange={(e) => setForm({ ...form, client_region: e.target.value })} className={`bg-white/5${errorRing(errors.client_region)}`} />
              <FieldError message={errors.client_region} />
              </div>
            </div>
            <div>
              <Label>Dirección de entrega (barrio, calle, número)</Label>
              <Input required minLength={4} value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className={`bg-white/5${errorRing(errors.client_address)}`} />
              <FieldError message={errors.client_address} />
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

function ShareDialog({ product, impulsadorId }: { product: Product; impulsadorId: string | null }) {
  const base = typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : "";
  const url = impulsadorId ? `${base}?ref=${impulsadorId}` : base;
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
