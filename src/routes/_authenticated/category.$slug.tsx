import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/category/$slug")({
  component: CategoryPage,
});

interface Cat { id: string; name: string; description: string | null; color: string | null }
interface Product { id: string; slug: string; name: string; price: number; short_description: string | null; images: unknown }

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      return data as Cat | null;
    },
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["category-products", category?.id],
    enabled: !!category?.id,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("category_id", category!.id).eq("is_active", true);
      return data as Product[];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div className="mt-6">
        <h1 className="font-display text-4xl font-bold sm:text-5xl hive-gradient-text">{category?.name ?? slug}</h1>
        <p className="mt-2 text-muted-foreground">{category?.description}</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => {
            const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
            const cover = imgs[0];
            return (
            <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="hive-card group overflow-hidden">
              <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-hive/20 via-ao-red/10 to-anma-orange/15">
                {cover ? (
                  <img src={cover} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <>
                    <div className="absolute inset-0 hive-grid-bg opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold opacity-20">{p.name.charAt(0)}</div>
                  </>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.short_description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-lg font-bold">S/ {Number(p.price).toFixed(2)}</span>
                  <ArrowRight className="h-4 w-4 text-hive opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
