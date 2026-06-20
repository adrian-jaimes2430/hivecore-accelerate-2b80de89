import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Crown, Loader2, ExternalLink } from "lucide-react";
import { ShareBar } from "@/components/luxury/ShareBar";

export const Route = createFileRoute("/_authenticated/luxury/$slug")({
  component: LuxuryProduct,
});

interface LuxProduct {
  id: string; sku: string | null; name: string; slug: string;
  short_description: string | null; description: string | null;
  images: unknown; category_id: string | null; brand_id: string | null;
  price: number; suggested_retail_price: number;
  stock_status: string; stock_quantity: number;
  attributes: Record<string, unknown>;
}

function LuxuryProduct() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [activeImg, setActiveImg] = useState(0);
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

  const imgs = Array.isArray(product.images) ? (product.images as string[]) : [];
  const utility = Number(product.suggested_retail_price) - Number(product.price);
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;

  const publicUrl = user ? `${SITE_URL}/catalogo/${product.slug}?ref=${user.id}` : `${SITE_URL}/catalogo/${product.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/luxury" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> AnMa Luxury Collection
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-xl border border-border/40 bg-zinc-950">
            {imgs[activeImg] ? (
              <img src={imgs[activeImg]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-6xl opacity-20">{product.name.charAt(0)}</div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {imgs.map((u, i) => (
                <button key={u} onClick={() => setActiveImg(i)} className={`aspect-square overflow-hidden rounded-md border ${i === activeImg ? "border-[color:var(--luxury-gold)]" : "border-border/40"}`}>
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--luxury-gold)]/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Luxury
            </div>
            {brand && <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{brand.name}</p>}
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
            {product.sku && <p className="mt-1 text-xs text-muted-foreground">SKU: {product.sku}</p>}
          </div>

          {product.short_description && <p className="text-muted-foreground">{product.short_description}</p>}

          <div className="rounded-xl border border-[color:var(--luxury-gold)]/30 bg-black/40 p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold">S/ {Number(product.price).toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">precio impulsador</span>
            </div>
            {product.suggested_retail_price > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">Precio sugerido al cliente: <span className="text-foreground">S/ {Number(product.suggested_retail_price).toFixed(2)}</span></p>
            )}
            {utility > 0 && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-md border border-[color:var(--luxury-gold)]/40 bg-[color:var(--luxury-gold)]/10 px-3 py-1 text-sm font-medium text-[color:var(--luxury-gold)]">
                Utilidad estimada: +S/ {utility.toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status={product.stock_status} qty={product.stock_quantity} />
            <Button variant="ghost" size="sm" onClick={share} className="border border-border/60">
              <Share2 className="mr-1 h-3 w-3" /> Compartir
            </Button>
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
