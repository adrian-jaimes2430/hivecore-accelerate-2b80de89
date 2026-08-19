import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, TrendingUp, Star, Flame, Layers, ArrowRight, Crown, Eye } from "lucide-react";
import { ShareBar } from "@/components/luxury/ShareBar";
import { Reveal } from "@/components/Reveal";
import { Rail } from "@/components/Rail";

import type { LucideIcon } from "lucide-react";
import { formatCOP } from "@/lib/pricing";
import { LEVEL_LABEL, levelChip } from "@/lib/levels";

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — HIVECORE" }] }),
});

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  short_description: string | null;
  images: unknown;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_recommended: boolean;
  category_id: string | null;
}
interface Category { id: string; slug: string; name: string; color: string | null; description: string | null }

const TAGS = [
  { key: "all", label: "Todos" },
  { key: "top", label: "TOP ventas" },
  { key: "hot", label: "Tendencia" },
  { key: "new", label: "Nuevos" },
  { key: "featured", label: "Destacados" },
  { key: "profit", label: "Más ganancia" },
] as const;
type TagKey = (typeof TAGS)[number]["key"];

/** Comisión del impulsador: 20% del total de la venta. */
const COMMISSION_RATE = 0.2;

function Dashboard() {
  const { profile, user, canLuxury, level } = useAuth();
  const [tag, setTag] = useState<TagKey>("all");
  const SITE_URL = "https://hivecore-shop.lovable.app";
  const myCatalogUrl = user ? `${SITE_URL}/catalogo?ref=${user.id}` : `${SITE_URL}/catalogo`;

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true);
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const featured = products.filter((p) => p.is_featured);
  const trending = products.filter((p) => p.is_trending);
  const isNew = products.filter((p) => p.is_new);
  const bestsellers = products.filter((p) => p.is_bestseller);
  const recommended = products.filter((p) => p.is_recommended);

  const tagged = useMemo(() => {
    switch (tag) {
      case "top": return bestsellers;
      case "hot": return trending;
      case "new": return isNew;
      case "featured": return featured;
      case "profit": return [...products].sort((a, b) => Number(b.price) - Number(a.price));
      default: return [];
    }
  }, [tag, products, bestsellers, trending, isNew, featured]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Welcome */}
      <div className="mb-8 grid gap-4 sm:mb-10 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 animate-rise">
          <p className="shop-eyebrow">Bienvenido de nuevo</p>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] sm:text-4xl">
            Hola, <span className="hive-gradient-text">{profile?.full_name?.split(" ")[0] ?? "Impulsador"}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Tu catálogo premium del ecosistema A&O.</p>
        </div>
        <div className="shop-panel flex flex-wrap items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-hive hive-pulse" />
            <p className="text-sm font-medium text-hive">Aprobado</p>
          </div>
          <span className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Nivel</p>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${levelChip(level)}`}>
              {LEVEL_LABEL[level]}
            </span>
          </div>
          <span className="h-4 w-px bg-border/60" />
          <p className="text-xs text-muted-foreground">
            Comisión <span className="font-semibold text-hive">20%</span> por venta
          </p>
        </div>
      </div>

      {/* Luxury hero */}
      {canLuxury && (
      <Reveal className="shop-card relative mb-8 overflow-hidden p-5 sm:mb-10 sm:p-8" from="scale">
        <div className="absolute inset-0 hive-grid-bg opacity-15" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Premium
            </div>
            <h2 className="mt-3 font-display text-xl font-bold tracking-[-0.03em] sm:text-3xl">
              AnMa Luxury Collection
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Comparte tu catálogo premium con clientes — sin que ellos tengan que registrarse. Tus pedidos llegan por WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/luxury" className="shop-btn-accent">
                Explorar catálogo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a href={myCatalogUrl} target="_blank" rel="noopener noreferrer" className="shop-btn-outline text-muted-foreground hover:text-foreground">
                Ver mi vista pública
              </a>
            </div>
          </div>
          <div className="md:max-w-sm">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Compartir mi catálogo</p>
            <ShareBar url={myCatalogUrl} title="AnMa Luxury Collection" text="Descubre piezas premium seleccionadas" />
          </div>
        </div>
      </Reveal>
      )}

      {/* Tag ribbon — filtra al instante */}
      <div className="-mx-4 mb-6 sm:-mx-6">
        <div className="rail-scroll flex gap-2 overflow-x-auto px-4 pb-1 sm:px-6">
          {TAGS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTag(t.key)}
              data-active={tag === t.key}
              className="shop-chip shrink-0 whitespace-nowrap !py-2 !pl-4 !pr-4 text-[13px]"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tag !== "all" ? (
        <section className="mb-14">
          <Reveal className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] sm:text-xl">
              {TAGS.find((t) => t.key === tag)?.label}
            </h2>
            <span className="text-xs text-muted-foreground">{tagged.length} productos</span>
          </Reveal>
          {tagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin productos con esta etiqueta.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {tagged.map((p, i) => (
                <Reveal key={p.id} delay={Math.min((i % 4) * 60, 240)}>
                  <ProductCardWithQuick p={p} showCommission={tag === "profit"} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Categorías con mosaico 2x2 en cinta horizontal */}
          <Section title="Explorar categorías" icon={Layers}>
            <Rail itemClassName="w-[78vw] sm:w-[340px] lg:w-[300px]">
              {categories.map((c) => {
                const tiles = products.filter((p) => p.category_id === c.id).slice(0, 4);
                return (
                  <div key={c.id} className="h-full">
                    <Link
                      to="/category/$slug"
                      params={{ slug: c.slug }}
                      className="group mb-3 inline-flex items-center gap-1.5 font-display text-lg font-semibold tracking-[-0.02em]"
                    >
                      {c.name}
                      <ArrowRight className="h-4 w-4 text-hive transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      {tiles.length === 0 ? (
                        <p className="col-span-2 text-xs text-muted-foreground">Sin productos aún.</p>
                      ) : (
                        tiles.map((p) => {
                          const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
                          return (
                            <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="shop-tile group block">
                              {imgs[0] ? (
                                <img src={imgs[0]} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold opacity-20">{p.name.charAt(0)}</div>
                              )}
                              <span className="shop-tile-label line-clamp-1">{p.name}</span>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </Rail>
          </Section>

          <RailSection title="Productos destacados" icon={Sparkles} items={featured} />
          <RailSection title="Tendencia" icon={Flame} items={trending} />
          <RailSection title="Más vendidos" icon={TrendingUp} items={bestsellers} />
          <RailSection title="Recomendados para ti" icon={Star} items={recommended} />
          <RailSection title="Nuevos lanzamientos" icon={Sparkles} items={isNew} />
        </>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="mb-12 sm:mb-14">
      <Reveal className="mb-4 flex items-center gap-2 sm:mb-5">
        <Icon className="h-4 w-4 text-hive" />
        <h2 className="font-display text-lg font-semibold tracking-[-0.02em] sm:text-xl">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}

function RailSection({ title, icon, items }: { title: string; icon: LucideIcon; items: Product[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title} icon={icon}>
      <Rail itemClassName="w-[66vw] sm:w-[280px] lg:w-[260px]">
        {items.map((p) => (
          <ProductCardWithQuick key={p.id} p={p} />
        ))}
      </Rail>
    </Section>
  );
}

function ProductCardWithQuick({ p, showCommission = false }: { p: Product; showCommission?: boolean }) {
  const [quick, setQuick] = useState(false);
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  const cover = imgs[0];

  return (
    <>
      <div className="shop-card group flex h-full flex-col">
        <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
          <div className="shop-media relative m-2 aspect-[4/5] w-[calc(100%-1rem)]">
            {cover ? (
              <img src={cover} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
            ) : (
              <>
                <div className="absolute inset-0 hive-grid-bg opacity-40" />
                <div className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold opacity-20">
                  {p.name.charAt(0)}
                </div>
              </>
            )}
            <div className="absolute right-2 top-2 flex flex-col gap-1 sm:right-3 sm:top-3">
              {p.is_new && <Badge color="bg-hive/90 text-black">NUEVO</Badge>}
              {p.is_bestseller && <Badge color="bg-white/90 text-black">TOP</Badge>}
              {p.is_trending && <Badge color="bg-black/70 text-white">HOT</Badge>}
            </div>
          </div>
        </Link>
        <div className="flex flex-1 flex-col px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
          <Link to="/product/$slug" params={{ slug: p.slug }}>
            <h3 className="line-clamp-2 text-sm font-semibold tracking-[-0.01em] sm:text-[15px]">{p.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-2 hidden text-xs text-muted-foreground sm:block">{p.short_description}</p>
          <div className="mt-2 sm:mt-3">
            <span className="shop-price text-base sm:text-lg">{formatCOP(Number(p.price))}</span>
            {showCommission && (
              <p className="mt-0.5 text-[11px] font-medium text-hive">
                Ganas {formatCOP(Number(p.price) * COMMISSION_RATE)}
              </p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => setQuick(true)} className="shop-btn-outline flex-1 justify-center text-xs">
              <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Vista rápida</span><span className="sm:hidden">Ver</span>
            </button>
            <Link to="/product/$slug" params={{ slug: p.slug }} className="shop-btn-accent text-xs">
              Funnel <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={quick} onOpenChange={setQuick}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <QuickView p={p} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function QuickView({ p }: { p: Product }) {
  const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
  const [active, setActive] = useState(0);
  const cover = imgs[active];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="shop-media relative aspect-[4/5] overflow-hidden">
          {cover ? (
            <img src={cover} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-display text-6xl font-bold opacity-20">{p.name.charAt(0)}</div>
          )}
        </div>
        {imgs.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {imgs.map((u, i) => (
              <button
                key={u + i}
                type="button"
                onClick={() => setActive(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition ${i === active ? "border-hive" : "border-white/10 opacity-70 hover:opacity-100"}`}
              >
                <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-[-0.02em] sm:text-2xl">{p.name}</DialogTitle>
        </DialogHeader>
        {p.short_description && <p className="text-sm text-muted-foreground">{p.short_description}</p>}
        <div className="shop-panel px-4 py-3">
          <span className="shop-price text-2xl">{formatCOP(Number(p.price))}</span>
          <p className="mt-1 text-xs text-hive">Tu comisión: {formatCOP(Number(p.price) * COMMISSION_RATE)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.is_new && <Badge color="bg-hive/90 text-black">NUEVO</Badge>}
          {p.is_bestseller && <Badge color="bg-white/90 text-black">TOP</Badge>}
          {p.is_trending && <Badge color="bg-black/70 text-white">HOT</Badge>}
          {p.is_featured && <Badge color="bg-white/10 text-foreground">DESTACADO</Badge>}
        </div>
        <Link to="/product/$slug" params={{ slug: p.slug }} className="shop-btn-accent w-full justify-center">
          Ver funnel completo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${color}`}>{children}</span>;
}
