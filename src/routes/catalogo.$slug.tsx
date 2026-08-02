import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { ArrowLeft, Crown, MessageCircle, Mail, Sparkles, ShieldCheck } from "lucide-react";
import { getLuxuryProductPublic, getImpulsadorRef } from "@/lib/luxury-public.functions";
import { ShareBar } from "@/components/luxury/ShareBar";
import { MediaGallery, buildMedia } from "@/components/luxury/MediaGallery";
import { VariationPicker, summarizeVariations } from "@/components/luxury/VariationPicker";
import type { Variation } from "@/components/admin/VariationsEditor";

const SITE_URL = "https://hivecore-accelerate.lovable.app";

const searchSchema = z.object({
  ref: fallback(z.string().optional(), undefined).optional(),
});

export const Route = createFileRoute("/catalogo/$slug")({
  validateSearch: zodValidator(searchSchema),
  loader: async ({ params }) => {
    const data = await getLuxuryProductPublic({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  component: PublicProduct,
  head: ({ loaderData, params }) => {
    const p: any = (loaderData as any)?.product;
    if (!p) return { meta: [{ title: "Pieza — AnMa Luxury" }] };
    const imgs = Array.isArray(p.images) ? p.images : [];
    const cover = imgs[0];
    const title = `${p.name} — AnMa Luxury Collection`;
    const desc = p.short_description || (p.description ? String(p.description).slice(0, 160) : `Descubre ${p.name} en AnMa Luxury.`);
    const url = `${SITE_URL}/catalogo/${params.slug}`;
    const meta: any[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: p.name },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (cover) {
      meta.push({ property: "og:image", content: cover });
      meta.push({ name: "twitter:image", content: cover });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  errorComponent: ({ error }) => <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="mx-auto max-w-md px-4 py-16 text-center">Pieza no encontrada.</div>,
});

function PublicProduct() {
  const { product, brand } = Route.useLoaderData() as any;
  const { ref } = Route.useSearch();
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  const { data: impulsador } = useQuery({
    queryKey: ["impulsador-ref", ref],
    enabled: !!ref,
    queryFn: () => getImpulsadorRef({ data: { ref: ref! } }),
  });

  const media = buildMedia(product.images, product.videos);
  const variations: Variation[] = Array.isArray(product.variations) ? product.variations : [];
  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  const url = typeof window !== "undefined" ? window.location.href : `${SITE_URL}/catalogo/${product.slug}`;
  const price = Number(product.suggested_retail_price || product.price);
  const variantSummary = summarizeVariations(selectedVariations);

  const waText = encodeURIComponent(
    `Hola, me interesa la pieza "${product.name}" del catálogo AnMa Luxury (S/ ${price.toFixed(2)}).${variantSummary ? `\nOpciones: ${variantSummary}` : ""}\n${url}`,
  );
  const waHref = impulsador?.phone
    ? `https://wa.me/${impulsador.phone.replace(/[^\d]/g, "")}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[color:var(--luxury-gold)]/15 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/catalogo" search={{ ref }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> AnMa Luxury
          </Link>
          {impulsador && (
            <div className="text-right text-xs">
              <p className="text-muted-foreground">Tu asesor</p>
              <p className="text-[color:var(--luxury-gold)]">{impulsador.name}</p>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="animate-fade-up">
            <MediaGallery media={media} fallbackInitial={product.name.charAt(0)} />
          </div>

          <div className="space-y-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--luxury-gold)]/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[color:var(--luxury-gold)]">
                <Crown className="h-3 w-3" /> Luxury
              </div>
              {brand && <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{brand.name}</p>}
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-5xl">{product.name}</h1>
            </div>

            {product.short_description && <p className="text-muted-foreground">{product.short_description}</p>}

            <div className="rounded-2xl border border-[color:var(--luxury-gold)]/30 bg-gradient-to-br from-black to-[#1a1208] p-6 luxury-shine">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Precio</p>
              <p className="mt-1 font-display text-4xl font-bold luxury-gradient-text">S/ {price.toFixed(2)}</p>
              <StockBadge status={product.stock_status} />
            </div>

            {variations.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-white/[0.02] p-4">
                <VariationPicker variations={variations} value={selectedVariations} onChange={setSelectedVariations} />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <PublicCheckoutDialog
                productKind="luxury"
                slug={product.slug}
                productName={product.name}
                unitPrice={price}
                currencyPrefix="S/"
                ctaLabel="Comprar ahora"
                ref={ref ?? null}
                variations={variantSummary || null}
                triggerClassName="h-12 w-full rounded-xl border border-[color:var(--luxury-gold)]/40 bg-[color:var(--luxury-gold)]/15 px-5 text-base font-semibold text-[color:var(--luxury-gold)] hover:bg-[color:var(--luxury-gold)]/25"
              />
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 font-semibold text-black shadow-lg shadow-emerald-500/30 transition-transform hover:scale-[1.02]">
                <MessageCircle className="h-5 w-5" /> {impulsador?.name ? `Pedir a ${impulsador.name.split(" ")[0]} por WhatsApp` : "Hacer mi pedido por WhatsApp"}
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(`Me interesa: ${product.name}${variantSummary ? `\nOpciones: ${variantSummary}` : ""}\n${url}`)}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 px-5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground">
                <Mail className="h-4 w-4" /> Consultar por email
              </a>
            </div>

            <div className="pt-2">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Compartir esta pieza</p>
              <ShareBar url={url} title={product.name} text={product.short_description ?? undefined} />
            </div>

            {product.description && (
              <div className="pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Descripción</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {Object.keys(attrs).length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Atributos</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(attrs).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                      <dt className="capitalize text-muted-foreground">{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-[color:var(--luxury-gold)]" /> Autenticidad garantizada</span>
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-[color:var(--luxury-gold)]" /> Selección curada A&O</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border/40 py-10 text-center text-xs text-muted-foreground">
        AnMa Luxury Collection · A&O Ecosystem
      </footer>
    </div>
  );
}

function StockBadge({ status }: { status: string }) {
  const map: Record<string, { l: string; c: string }> = {
    in_stock: { l: "Disponible", c: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" },
    low_stock: { l: "Últimas unidades", c: "border-amber-500/40 text-amber-400 bg-amber-500/10" },
    out_of_stock: { l: "Agotado", c: "border-red-500/40 text-red-400 bg-red-500/10" },
    preorder: { l: "Pre-orden", c: "border-blue-500/40 text-blue-400 bg-blue-500/10" },
  };
  const s = map[status] ?? map.in_stock;
  return <span className={`mt-3 inline-block rounded-full border px-3 py-0.5 text-xs ${s.c}`}>{s.l}</span>;
}
