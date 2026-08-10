import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, TrendingUp, Star, Flame, Layers, ArrowRight, Crown, Eye } from "lucide-react";
import { ShareBar } from "@/components/luxury/ShareBar";
import { Reveal } from "@/components/Reveal";

import type { LucideIcon } from "lucide-react";
import { formatCOP } from "@/lib/pricing";

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

function Dashboard() {
  const { profile, user } = useAuth();
  const SITE_URL = "https://hivecore-accelerate.lovable.app";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Welcome */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="animate-rise">
          <p className="shop-eyebrow">Bienvenido de nuevo</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            Hola, <span className="hive-gradient-text">{profile?.full_name?.split(" ")[0] ?? "Impulsador"}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Tu catálogo premium del ecosistema A&O.</p>
        </div>
        <div className="shop-panel flex items-center gap-4 px-5 py-3">
          <div className="h-2 w-2 rounded-full bg-hive hive-pulse" />
          <p className="text-xs text-muted-foreground">Estado</p>
          <p className="text-sm font-medium text-hive">Aprobado</p>
        </div>
      </div>

      {/* Luxury hero — shop-style floating panel */}
      <Reveal className="shop-card relative mb-10 overflow-hidden p-6 sm:p-8" from="scale">
        <div className="absolute inset-0 hive-grid-bg opacity-15" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--luxury-gold)]/40 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[color:var(--luxury-gold)]">
              <Crown className="h-3 w-3" /> Premium
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
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


      {/* Category chips — Shop.app style */}
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((c, i) => (
          <Reveal key={c.id} delay={Math.min(i * 50, 300)}>
            <Link to="/category/$slug" params={{ slug: c.slug }} className="shop-chip">
              <span className={`shop-chip-dot ${colorChip(c.color)}`}>{c.name.charAt(0)}</span>
              {c.name}
            </Link>
          </Reveal>
        ))}
      </div>

      {/* Categories with product tiles — Shop.app columns */}
      <Section title="Explorar categorías" icon={Layers}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => {
            const tiles = products.filter((p) => p.category_id === c.id).slice(0, 4);
            return (
              <Reveal key={c.id} delay={Math.min(i * 70, 350)}>
                <div className="h-full">
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
              </Reveal>
            );
          })}
        </div>
      </Section>



      <Section title="Productos destacados" icon={Sparkles}><ProductGrid items={featured} /></Section>
      <Section title="Tendencia" icon={Flame}><ProductGrid items={trending} /></Section>
      <Section title="Más vendidos" icon={TrendingUp}><ProductGrid items={bestsellers} /></Section>
      <Section title="Recomendados para ti" icon={Star}><ProductGrid items={recommended} /></Section>
      <Section title="Nuevos lanzamientos" icon={Sparkles}><ProductGrid items={isNew} /></Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <Reveal className="mb-5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-hive" />
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  const [quick, setQuick] = useState<Product | null>(null);
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin productos por ahora.</p>;
  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p, i) => {
        const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
        const cover = imgs[0];
        return (
        <Reveal key={p.id} delay={Math.min((i % 4) * 70, 280)}>
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
              <div className="absolute right-3 top-3 flex flex-col gap-1">
                {p.is_new && <Badge color="bg-hive/90 text-black">NUEVO</Badge>}
                {p.is_bestseller && <Badge color="bg-white/90 text-black">TOP</Badge>}
                {p.is_trending && <Badge color="bg-black/70 text-white">HOT</Badge>}
              </div>
            </div>
            </Link>
            <div className="flex flex-1 flex-col px-4 pb-4 pt-1">
              <Link to="/product/$slug" params={{ slug: p.slug }}>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{p.name}</h3>
              </Link>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.short_description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="shop-price text-lg">{formatCOP(Number(p.price))}</span>
                {imgs.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">{imgs.length} fotos</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => setQuick(p)} className="shop-btn-outline flex-1 justify-center text-xs">
                  <Eye className="h-3.5 w-3.5" /> Vista rápida
                </button>
                <Link to="/product/$slug" params={{ slug: p.slug }} className="shop-btn-accent text-xs">
                  Funnel <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
        );
      })}
    </div>

    <Dialog open={!!quick} onOpenChange={(o) => !o && setQuick(null)}>
      <DialogContent className="max-w-3xl">
        {quick && <QuickView p={quick} />}
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
          <DialogTitle className="font-display text-2xl tracking-[-0.02em]">{p.name}</DialogTitle>
        </DialogHeader>
        {p.short_description && <p className="text-sm text-muted-foreground">{p.short_description}</p>}
        <div className="shop-panel px-4 py-3">
          <span className="shop-price text-2xl">{formatCOP(Number(p.price))}</span>
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

function colorChip(color: string | null) {
  switch (color) {
    case "red": return "bg-ao-red/15 text-ao-red border border-ao-red/30";
    case "orange": return "bg-anma-orange/15 text-anma-orange border border-anma-orange/30";
    default: return "bg-hive/15 text-hive border border-hive/30";
  }
}
