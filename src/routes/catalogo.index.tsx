import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Filter, Sparkles, ArrowRight, Search, MessageCircle, Film } from "lucide-react";
import { listLuxuryCatalog, getImpulsadorRef } from "@/lib/luxury-public.functions";
import { PromoCarousel, type Promo } from "@/components/luxury/PromoCarousel";

const searchSchema = z.object({
  cat: fallback(z.string().optional(), undefined).optional(),
  brand: fallback(z.string().optional(), undefined).optional(),
  q: fallback(z.string().optional(), undefined).optional(),
  ref: fallback(z.string().optional(), undefined).optional(),
});

const SITE_URL = "https://hivecore-accelerate.lovable.app";

export const Route = createFileRoute("/catalogo/")({
  validateSearch: zodValidator(searchSchema),
  loader: () => listLuxuryCatalog(),
  component: PublicCatalog,
  head: () => ({
    meta: [
      { title: "AnMa Luxury Collection — Catálogo Premium" },
      { name: "description", content: "Descubre piezas exclusivas: perfumería, relojería, joyería AAA y marroquinería premium. Calidad, exclusividad y elegancia A&O." },
      { property: "og:title", content: "AnMa Luxury Collection — Catálogo Premium" },
      { property: "og:description", content: "Perfumería, relojería, joyería AAA y marroquinería premium. Calidad, exclusividad y elegancia." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/catalogo` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/catalogo` }],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => <div className="mx-auto max-w-md px-4 py-16 text-center">Catálogo no disponible.</div>,
});

interface Cat { id: string; name: string; slug: string; parent_id: string | null; sort_order: number }
interface Brand { id: string; name: string; slug: string }
interface Product {
  id: string; name: string; slug: string; short_description: string | null;
  images: unknown; videos: unknown; category_id: string | null; brand_id: string | null;
  price: number; suggested_retail_price: number; is_featured: boolean;
  stock_status: string;
}

function PublicCatalog() {
  const { products, categories, brands, promos } = Route.useLoaderData() as {
    products: Product[]; categories: Cat[]; brands: Brand[]; promos: Promo[];
  };
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo/" });
  const [quickView, setQuickView] = useState<Product | null>(null);

  const { data: impulsador } = useQuery({
    queryKey: ["impulsador-ref", search.ref],
    enabled: !!search.ref,
    queryFn: () => getImpulsadorRef({ data: { ref: search.ref! } }),
  });

  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: ((prev: Record<string, unknown>) => ({ ...prev, ...patch })) as never });

  const roots = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);

  const filtered = useMemo(() => {
    let list = products;
    if (search.cat) {
      const cat = categories.find((c) => c.slug === search.cat);
      if (cat) {
        const ids = new Set([cat.id, ...childrenOf(cat.id).map((c) => c.id)]);
        list = list.filter((p) => p.category_id && ids.has(p.category_id));
      }
    }
    if (search.brand) {
      const b = brands.find((x) => x.slug === search.brand);
      if (b) list = list.filter((p) => p.brand_id === b.id);
    }
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.short_description ?? "").toLowerCase().includes(q));
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories, brands, search.cat, search.brand, search.q]);

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Categoría</p>
        <div className="space-y-1">
          <button onClick={() => setSearch({ cat: undefined })}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${!search.cat ? "bg-white/5" : "text-muted-foreground hover:bg-white/5"}`}>Todas</button>
          {roots.map((c) => (
            <div key={c.id}>
              <button onClick={() => setSearch({ cat: c.slug })}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${search.cat === c.slug ? "bg-white/5" : "text-muted-foreground hover:bg-white/5"}`}>{c.name}</button>
              {childrenOf(c.id).length > 0 && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-border/40 pl-2">
                  {childrenOf(c.id).map((s) => (
                    <button key={s.id} onClick={() => setSearch({ cat: s.slug })}
                      className={`block w-full rounded-md px-2 py-1 text-left text-xs ${search.cat === s.slug ? "text-[color:var(--luxury-gold)]" : "text-muted-foreground hover:text-foreground"}`}>{s.name}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Marca</p>
          <div className="space-y-1">
            <button onClick={() => setSearch({ brand: undefined })}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${!search.brand ? "bg-white/5" : "text-muted-foreground hover:bg-white/5"}`}>Todas</button>
            {brands.map((b) => (
              <button key={b.id} onClick={() => setSearch({ brand: b.slug })}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${search.brand === b.slug ? "bg-white/5" : "text-muted-foreground hover:bg-white/5"}`}>{b.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const refQs = search.ref ? `?ref=${search.ref}` : "";

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--luxury-gold)]/15 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/catalogo" search={{ ref: search.ref }} className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[color:var(--luxury-gold)]" />
            <span className="font-display text-lg font-bold luxury-gradient-text">AnMa Luxury</span>
          </Link>
          {impulsador && (
            <div className="hidden text-right text-xs sm:block">
              <p className="text-muted-foreground">Atendido por</p>
              <p className="text-[color:var(--luxury-gold)]">{impulsador.name}</p>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="relative mb-10 overflow-hidden rounded-2xl border border-[color:var(--luxury-gold)]/30 bg-gradient-to-br from-black via-zinc-950 to-[#1a1208] p-8 sm:p-14 luxury-shine animate-fade-up">
          <div className="absolute inset-0 hive-grid-bg opacity-20" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Colección Premium
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold sm:text-6xl">
              <span className="luxury-gradient-text">AnMa Luxury Collection</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Piezas seleccionadas a mano. Perfumería, relojería, joyería AAA y marroquinería de autor. Cada producto es una declaración.
            </p>
          </div>
        </section>

        {promos.length > 0 && <PromoCarousel promos={promos} />}



        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar piezas..." defaultValue={search.q} onBlur={(e) => setSearch({ q: e.target.value || undefined })} className="pl-9" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="border border-border/60 lg:hidden">
                <Filter className="mr-2 h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
              <div className="mt-6">{filtersPanel}</div>
            </SheetContent>
          </Sheet>
          <div className="text-xs text-muted-foreground">{filtered.length} piezas</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="hive-card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-5">{filtersPanel}</div>
          </aside>

          <div>
            {filtered.length === 0 ? (
              <div className="hive-card flex flex-col items-center justify-center gap-3 p-12 text-center">
                <Sparkles className="h-8 w-8 text-[color:var(--luxury-gold)]" />
                <p className="font-medium">Pronto en este catálogo</p>
                <p className="text-sm text-muted-foreground">Estamos cargando piezas premium. Vuelve en breve.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p, i) => (
                  <PublicCard key={p.id} p={p} brand={brands.find((b) => b.id === p.brand_id)?.name} index={i} refQs={refQs} onQuickView={() => setQuickView(p)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating contact CTA */}
      <FloatingCTA impulsador={impulsador ?? null} />

      <Dialog open={!!quickView} onOpenChange={(o) => !o && setQuickView(null)}>
        <DialogContent className="max-w-3xl">
          {quickView && <QuickPreview p={quickView} brand={brands.find((b) => b.id === quickView.brand_id)?.name} refQs={refQs} />}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border/40 py-10 text-center text-xs text-muted-foreground">
        AnMa Luxury Collection · A&O Ecosystem
      </footer>
    </div>
  );
}

function PublicCard({ p, brand, index, refQs, onQuickView }: { p: Product; brand?: string; index: number; refQs: string; onQuickView: () => void }) {
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  const vids = Array.isArray(p.videos) ? (p.videos as string[]) : [];
  const cover = imgs[0];
  return (
    <div className="hive-card group overflow-hidden animate-fade-up" style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}>
      <Link to="/catalogo/$slug" params={{ slug: p.slug }} search={refQs ? { ref: refQs.slice(5) } : {}} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-zinc-900 to-black">
          {cover ? (
            <img src={cover} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-display text-6xl font-bold opacity-15">{p.name.charAt(0)}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {p.is_featured && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Featured
            </span>
          )}
          {vids.length > 0 && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur">
              <Film className="h-3 w-3" /> Video
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-2 p-4">
        {brand && <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{brand}</p>}
        <h3 className="font-semibold leading-tight">{p.name}</h3>
        {p.short_description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.short_description}</p>}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-display text-lg font-bold luxury-gradient-text">S/ {Number(p.suggested_retail_price || p.price).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onQuickView} className="h-8 flex-1 border border-border/60 text-xs">Vista rápida</Button>
          <Link to="/catalogo/$slug" params={{ slug: p.slug }} search={refQs ? { ref: refQs.slice(5) } : {}} className="inline-flex h-8 items-center gap-1 rounded-md border border-[color:var(--luxury-gold)]/40 px-3 text-xs text-[color:var(--luxury-gold)] hover:bg-[color:var(--luxury-gold)]/10">
            Ver <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuickPreview({ p, brand, refQs }: { p: Product; brand?: string; refQs: string }) {
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid grid-cols-2 gap-2">
        {imgs.length === 0 ? (
          <div className="col-span-2 flex aspect-square items-center justify-center rounded-md bg-zinc-900 font-display text-6xl opacity-20">{p.name.charAt(0)}</div>
        ) : imgs.slice(0, 4).map((u, i) => (
          <img key={u} src={u} alt="" className={`rounded-md object-cover ${i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"}`} />
        ))}
      </div>
      <div className="space-y-3">
        <DialogHeader>
          {brand && <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{brand}</p>}
          <DialogTitle className="font-display text-2xl">{p.name}</DialogTitle>
        </DialogHeader>
        {p.short_description && <p className="text-sm text-muted-foreground">{p.short_description}</p>}
        <div className="rounded-lg border border-[color:var(--luxury-gold)]/30 bg-black/40 p-4">
          <span className="font-display text-2xl font-bold luxury-gradient-text">S/ {Number(p.suggested_retail_price || p.price).toFixed(2)}</span>
        </div>
        <Link to="/catalogo/$slug" params={{ slug: p.slug }} search={refQs ? { ref: refQs.slice(5) } : {}} className="inline-flex items-center gap-1 rounded-md bg-[color:var(--luxury-gold)]/15 px-3 py-2 text-sm text-[color:var(--luxury-gold)] hover:bg-[color:var(--luxury-gold)]/25">
          Ver ficha y reservar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function FloatingCTA({ impulsador }: { impulsador: { id: string; name: string | null; phone: string | null } | null }) {
  const text = encodeURIComponent("Hola, vi tu catálogo AnMa Luxury y me interesa una pieza.");
  const href = impulsador?.phone
    ? `https://wa.me/${impulsador.phone.replace(/[^\d]/g, "")}?text=${text}`
    : `https://wa.me/?text=${text}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500 px-4 py-3 text-sm font-medium text-black shadow-2xl shadow-emerald-500/30 transition-transform hover:scale-105"
    >
      <MessageCircle className="h-4 w-4" />
      {impulsador?.name ? `Contactar a ${impulsador.name.split(" ")[0]}` : "Hacer mi pedido"}
    </a>
  );
}
