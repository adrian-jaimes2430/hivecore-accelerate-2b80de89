import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sparkles, TrendingUp, Star, Flame, Layers, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  const { profile } = useAuth();

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
        <div>
          <p className="text-sm text-muted-foreground">Bienvenido de nuevo</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Hola, <span className="hive-gradient-text">{profile?.full_name?.split(" ")[0] ?? "Impulsador"}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Tu catálogo premium del ecosistema A&O.</p>
        </div>
        <div className="hive-card flex items-center gap-4 px-5 py-3">
          <div className="h-2 w-2 rounded-full bg-hive hive-pulse" />
          <p className="text-xs text-muted-foreground">Estado</p>
          <p className="text-sm font-medium text-hive">Aprobado</p>
        </div>
      </div>

      {/* Categories */}
      <Section title="Categorías" icon={Layers}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="hive-card group p-5">
              <div className={`mb-3 inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ${colorChip(c.color)}`}>
                {c.name}
              </div>
              <p className="text-sm text-muted-foreground">{c.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-hive opacity-0 transition group-hover:opacity-100">
                Explorar <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
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
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-hive" />
        <h2 className="font-display text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin productos por ahora.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => (
        <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="hive-card group overflow-hidden">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-hive/20 via-ao-red/10 to-anma-orange/15">
            <div className="absolute inset-0 hive-grid-bg opacity-40" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold opacity-20">
              {p.name.charAt(0)}
            </div>
            <div className="absolute right-3 top-3 flex flex-col gap-1">
              {p.is_new && <Badge color="bg-hive/90 text-black">NUEVO</Badge>}
              {p.is_bestseller && <Badge color="bg-ao-red/90 text-white">TOP</Badge>}
              {p.is_trending && <Badge color="bg-anma-orange/90 text-black">HOT</Badge>}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.short_description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-display text-lg font-bold">S/ {Number(p.price).toFixed(2)}</span>
              <span className="inline-flex items-center gap-1 text-xs text-hive opacity-0 transition group-hover:opacity-100">
                Ver funnel <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </Link>
      ))}
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
