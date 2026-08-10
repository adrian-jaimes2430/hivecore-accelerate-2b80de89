import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ShareBar } from "@/components/luxury/ShareBar";
import { PromoCarousel, type Promo } from "@/components/luxury/PromoCarousel";
import { Reveal } from "@/components/Reveal";
import { Crown, Filter, Sparkles, Loader2, ArrowRight, Search, ExternalLink, Film } from "lucide-react";
import { formatCOP } from "@/lib/pricing";

const searchSchema = z.object({
  cat: fallback(z.string().optional(), undefined).optional(),
  brand: fallback(z.string().optional(), undefined).optional(),
  q: fallback(z.string().optional(), undefined).optional(),
  min: fallback(z.coerce.number().optional(), undefined).optional(),
  max: fallback(z.coerce.number().optional(), undefined).optional(),
  stock: fallback(z.string().optional(), undefined).optional(),
});

export const Route = createFileRoute("/_authenticated/luxury/")({
  validateSearch: zodValidator(searchSchema),
  component: LuxuryCatalog,
  head: () => ({
    meta: [
      { title: "AnMa Luxury Collection — A&O Ecosystem" },
      { name: "description", content: "Catálogo premium de perfumería, relojería, joyería AAA y marroquinería para impulsadores A&O." },
    ],
  }),
});

interface LuxCategory { id: string; name: string; slug: string; parent_id: string | null; sort_order: number }
interface LuxBrand { id: string; name: string; slug: string }
interface LuxProduct {
  id: string; sku: string | null; name: string; slug: string;
  short_description: string | null; description: string | null;
  images: unknown; videos: unknown; category_id: string | null; brand_id: string | null;
  price: number; suggested_retail_price: number; show_impulsador_price: boolean;
  stock_status: string; stock_quantity: number;
  attributes: Record<string, unknown>; is_featured: boolean;
}

function LuxuryCatalog() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/luxury/" });
  const { user } = useAuth();
  const [quickView, setQuickView] = useState<LuxProduct | null>(null);
  const SITE_URL = "https://hivecore-accelerate.lovable.app";
  const myCatalogUrl = user ? `${SITE_URL}/catalogo?ref=${user.id}` : `${SITE_URL}/catalogo`;

  const { data: categories = [] } = useQuery({
    queryKey: ["luxury-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("luxury_categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as LuxCategory[];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["luxury-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("luxury_brands").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as LuxBrand[];
    },
  });

  const { data: promos = [] } = useQuery({
    queryKey: ["luxury-promos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("luxury_promos")
        .select("id,title,subtitle,media_type,media_url,link_url,cta_label")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as Promo[];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["luxury-products", search],
    queryFn: async () => {
      let q = supabase.from("luxury_products").select("*").eq("is_active", true);
      if (search.cat) {
        const cat = categories.find((c) => c.slug === search.cat);
        if (cat) {
          const ids: string[] = [];
          const walk = (id: string) => {
            ids.push(id);
            categories.filter((c) => c.parent_id === id).forEach((c) => walk(c.id));
          };
          walk(cat.id);
          q = q.in("category_id", ids);
        }
      }
      if (search.brand) {
        const b = brands.find((x) => x.slug === search.brand);
        if (b) q = q.eq("brand_id", b.id);
      }
      if (search.stock) q = q.eq("stock_status", search.stock);
      if (typeof search.min === "number") q = q.gte("price", search.min);
      if (typeof search.max === "number") q = q.lte("price", search.max);
      if (search.q) q = q.ilike("name", `%${search.q}%`);
      const { data, error } = await q.order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as LuxProduct[];
    },
    enabled: categories.length > 0 || !search.cat,
  });

  const roots = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const activeCat = categories.find((c) => c.slug === search.cat);
  const activeRoot = activeCat
    ? activeCat.parent_id
      ? (categories.find((c) => c.id === activeCat.parent_id) ?? activeCat)
      : activeCat
    : undefined;

  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: ((prev: Record<string, unknown>) => ({ ...prev, ...patch })) as never });

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Categoría</p>
        <div className="space-y-1">
          <button
            onClick={() => setSearch({ cat: undefined })}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${!search.cat ? "bg-white/5 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
          >Todas</button>
          {roots.map((c) => (
            <div key={c.id}>
              <button
                onClick={() => setSearch({ cat: c.slug })}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${search.cat === c.slug ? "bg-white/5 text-foreground" : "text-muted-foreground hover:bg-white/5"}`}
              >{c.name}</button>
              {childrenOf(c.id).length > 0 && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-border/40 pl-2">
                  {childrenOf(c.id).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSearch({ cat: s.slug })}
                      className={`block w-full rounded-md px-2 py-1 text-left text-xs ${search.cat === s.slug ? "text-[color:var(--luxury-gold)]" : "text-muted-foreground hover:text-foreground"}`}
                    >{s.name}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Marca</p>
        {brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin marcas todavía.</p>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => setSearch({ brand: undefined })}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${!search.brand ? "bg-white/5" : "text-muted-foreground hover:bg-white/5"}`}
            >Todas</button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setSearch({ brand: b.slug })}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${search.brand === b.slug ? "bg-white/5" : "text-muted-foreground hover:bg-white/5"}`}
              >{b.name}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Precio</p>
        <div className="flex gap-2">
          <Input type="number" placeholder="Min" defaultValue={search.min} onBlur={(e) => setSearch({ min: e.target.value ? Number(e.target.value) : undefined })} className="h-9" />
          <Input type="number" placeholder="Max" defaultValue={search.max} onBlur={(e) => setSearch({ max: e.target.value ? Number(e.target.value) : undefined })} className="h-9" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">Disponibilidad</p>
        <div className="space-y-2">
          {[
            { v: undefined, l: "Todos" },
            { v: "in_stock", l: "En stock" },
            { v: "low_stock", l: "Pocas unidades" },
            { v: "preorder", l: "Pre-orden" },
            { v: "out_of_stock", l: "Agotado" },
          ].map((o) => (
            <label key={String(o.v)} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={search.stock === o.v} onCheckedChange={() => setSearch({ stock: o.v })} />
              {o.l}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="luxury-shine animate-fade-up relative mb-10 overflow-hidden rounded-[28px] border border-[color:var(--luxury-gold)]/30 bg-gradient-to-br from-black via-zinc-950 to-[#1a1208] p-8 sm:p-12">
        <div className="absolute inset-0 hive-grid-bg opacity-20" />
        <div className="relative">
          <div className="mercury-tag border-[color:var(--luxury-gold)]/40 bg-black/40 text-[color:var(--luxury-gold)]">
            <Crown className="h-3 w-3" /> Premium Unit
          </div>
          <h1 className="mercury-display mt-5 text-4xl sm:text-5xl">
            <span className="luxury-gradient-text">AnMa Luxury Collection</span>
          </h1>
          <p className="mercury-muted mt-3 max-w-2xl text-sm sm:text-base">
            Productos premium de alto valor percibido — perfumería, relojería, joyería AAA y marroquinería. Mayores márgenes para impulsadores A&O.
          </p>
          <div className="mt-7 space-y-3">
            <a href={myCatalogUrl} target="_blank" rel="noopener noreferrer"
              className="shop-btn-quiet border-[color:var(--luxury-gold)]/40 !text-[color:var(--luxury-gold)]">
              <ExternalLink className="h-4 w-4" /> Ver mi catálogo público
            </a>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Compartir mi catálogo</p>
              <ShareBar url={myCatalogUrl} title="AnMa Luxury Collection" text="Descubre piezas premium seleccionadas" />
            </div>
          </div>
        </div>
      </div>


      {promos.length > 0 && <PromoCarousel promos={promos} />}



      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar productos, marcas, categorías..."
            defaultValue={search.q}
            onBlur={(e) => setSearch({ q: e.target.value || undefined })}
            className="shop-pill border-white/10 bg-white/[0.04] pl-11"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="shop-btn-quiet lg:hidden">
              <Filter className="h-4 w-4" /> Filtros
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
            <div className="mt-6">{filtersPanel}</div>
          </SheetContent>
        </Sheet>
        <div className="text-xs text-muted-foreground">{products.length} productos</div>
      </div>

      {/* Main categories — Shop.app circular chips */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button className="shop-chip" data-active={!search.cat} onClick={() => setSearch({ cat: undefined })}>
          <span className="shop-chip-dot">★</span> Todas
        </button>
        {roots.map((c) => (
          <button
            key={c.id}
            className="shop-chip"
            data-active={search.cat === c.slug || childrenOf(c.id).some((s) => s.slug === search.cat)}
            onClick={() => setSearch({ cat: c.slug })}
          >
            <span className="shop-chip-dot">{c.name.charAt(0)}</span> {c.name}
          </button>
        ))}
      </div>

      {/* Subcategories of the active main category */}
      {activeRoot && childrenOf(activeRoot.id).length > 0 && (
        <div className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground data-[active=true]:border-[color:var(--luxury-gold)]/50 data-[active=true]:bg-[color:var(--luxury-gold)]/10 data-[active=true]:text-[color:var(--luxury-gold)]"
            data-active={search.cat === activeRoot.slug}
            onClick={() => setSearch({ cat: activeRoot.slug })}
          >
            Todo en {activeRoot.name}
          </button>
          {childrenOf(activeRoot.id).map((sub) => (
            <button
              key={sub.id}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground data-[active=true]:border-[color:var(--luxury-gold)]/50 data-[active=true]:bg-[color:var(--luxury-gold)]/10 data-[active=true]:text-[color:var(--luxury-gold)]"
              data-active={search.cat === sub.slug}
              onClick={() => setSearch({ cat: sub.slug })}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block">
          <div className="hive-card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-5">
            {filtersPanel}
          </div>
        </aside>

        {/* Grid */}
        <div>
          {isLoading ? (
            <div className="flex h-60 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[color:var(--luxury-gold)]" /></div>
          ) : products.length === 0 ? (
            <div className="hive-card flex flex-col items-center justify-center gap-3 p-12 text-center">
              <Sparkles className="h-8 w-8 text-[color:var(--luxury-gold)]" />
              <p className="font-medium">Pronto en este catálogo</p>
              <p className="text-sm text-muted-foreground">El equipo A&O está cargando las piezas premium. Vuelve en breve.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} p={p} index={i} brand={brands.find((b) => b.id === p.brand_id)?.name} onQuickView={() => setQuickView(p)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!quickView} onOpenChange={(o) => !o && setQuickView(null)}>
        <DialogContent className="max-w-3xl">
          {quickView && <QuickView p={quickView} brand={brands.find((b) => b.id === quickView.brand_id)?.name} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCard({ p, brand, index = 0, onQuickView }: { p: LuxProduct; brand?: string; index?: number; onQuickView: () => void }) {
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  const vids = Array.isArray(p.videos) ? (p.videos as string[]) : [];
  const cover = imgs[0];
  const utility = Number(p.suggested_retail_price) - Number(p.price);
  const showImp = p.show_impulsador_price !== false;
  const finalPrice = Number(p.suggested_retail_price || p.price);

  return (
    <Reveal className="shop-card group" delay={Math.min((index % 6) * 70, 420)} from="up">
      <Link to="/luxury/$slug" params={{ slug: p.slug }} className="block">
        <div className="shop-media relative m-2 aspect-[4/5]">
          {cover ? (
            <img src={cover} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold opacity-15">{p.name.charAt(0)}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {p.is_featured && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Featured
            </span>
          )}
          {vids.length > 0 && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
              <Film className="h-3 w-3" /> {vids.length}
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-2 px-4 pb-5 pt-2">
        {brand && <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{brand}</p>}
        <h3 className="font-semibold leading-tight">{p.name}</h3>
        {p.short_description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.short_description}</p>}
        {showImp ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold">{formatCOP(Number(p.price))}</span>
              {p.suggested_retail_price > p.price && (
                <span className="text-xs text-muted-foreground line-through">{formatCOP(Number(p.suggested_retail_price))}</span>
              )}
            </div>
            {utility > 0 && (
              <div className="inline-flex items-center gap-1 rounded-md border border-[color:var(--luxury-gold)]/30 bg-[color:var(--luxury-gold)]/10 px-2 py-0.5 text-[11px] font-medium text-[color:var(--luxury-gold)]">
                +{formatCOP(utility)} utilidad
              </div>
            )}
          </>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold luxury-gradient-text">{formatCOP(finalPrice)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-3">
          <button onClick={onQuickView} className="shop-btn-quiet flex-1">Vista rápida</button>
          <Link to="/luxury/$slug" params={{ slug: p.slug }} className="shop-btn">
            Ver <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

function QuickView({ p, brand }: { p: LuxProduct; brand?: string }) {
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  const utility = Number(p.suggested_retail_price) - Number(p.price);
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
        {p.description && <p className="text-sm">{p.description}</p>}
        <div className="rounded-lg border border-[color:var(--luxury-gold)]/30 bg-black/40 p-4">
          {p.show_impulsador_price !== false ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold">{formatCOP(Number(p.price))}</span>
                <span className="text-xs text-muted-foreground">precio impulsador</span>
              </div>
              {p.suggested_retail_price > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">Sugerido al cliente: <span className="text-foreground">{formatCOP(Number(p.suggested_retail_price))}</span></p>
              )}
              {utility > 0 && <p className="mt-1 text-sm text-[color:var(--luxury-gold)]">Utilidad estimada: +{formatCOP(utility)}</p>}
            </>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl font-bold luxury-gradient-text">{formatCOP(Number(p.suggested_retail_price || p.price))}</span>
              <span className="text-xs text-muted-foreground">precio final</span>
            </div>
          )}
        </div>
        <Link to="/luxury/$slug" params={{ slug: p.slug }} className="inline-flex items-center gap-1 text-sm text-[color:var(--luxury-gold)]">
          Ver ficha completa <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
