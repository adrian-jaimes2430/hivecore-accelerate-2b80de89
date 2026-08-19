import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/pricing";
import { Search, X, ArrowRight, Crown } from "lucide-react";

interface Row {
  id: string;
  name: string;
  slug: string;
  price: number;
  sku: string | null;
  short_description: string | null;
  images: unknown;
  kind: "funnel" | "luxury";
  category: string | null;
  brand: string | null;
}

function firstImage(images: unknown): string | null {
  const arr = Array.isArray(images) ? (images as unknown[]) : [];
  const first = arr[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in (first as Record<string, unknown>)) {
    const u = (first as Record<string, unknown>).url;
    return typeof u === "string" ? u : null;
  }
  return null;
}

/** Floating bottom search pill (shop.app style) with instant keyword results. */
export function CatalogSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: rows = [] } = useQuery({
    queryKey: ["catalog-search-index"],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Row[]> => {
      const [prod, lux, cats, luxCats, brands] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,slug,price,sku,short_description,images,category_id")
          .eq("is_active", true),
        supabase
          .from("luxury_products")
          .select("id,name,slug,suggested_retail_price,sku,short_description,images,category_id,brand_id")
          .eq("is_active", true),
        supabase.from("categories").select("id,name"),
        supabase.from("luxury_categories").select("id,name"),
        supabase.from("luxury_brands").select("id,name"),
      ]);

      const catName = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
      const luxCatName = new Map((luxCats.data ?? []).map((c) => [c.id, c.name]));
      const brandName = new Map((brands.data ?? []).map((b) => [b.id, b.name]));

      const a: Row[] = (prod.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        sku: p.sku,
        short_description: p.short_description,
        images: p.images,
        kind: "funnel",
        category: p.category_id ? catName.get(p.category_id) ?? null : null,
        brand: null,
      }));

      const b: Row[] = (lux.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.suggested_retail_price),
        sku: p.sku,
        short_description: p.short_description,
        images: p.images,
        kind: "luxury",
        category: p.category_id ? luxCatName.get(p.category_id) ?? null : null,
        brand: p.brand_id ? brandName.get(p.brand_id) ?? null : null,
      }));

      return [...a, ...b];
    },
  });

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const words = term.split(/\s+/);
    return rows
      .filter((r) => {
        const hay = [r.name, r.short_description, r.sku, r.category, r.brand]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 24);
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of results) {
      const key = r.category ?? (r.kind === "luxury" ? "AnMa Luxury" : "Otros");
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`search-dock ${open ? "search-dock-open" : ""}`}>
        {open && (
          <div className="search-panel animate-scale-in">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {q.trim().length < 2 ? "Busca por nombre, SKU, marca o categoría" : `${results.length} resultados`}
              </p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-semibold tracking-tight text-hive">{group}</p>
                  <ul className="space-y-1.5">
                    {items.map((r) => {
                      const img = firstImage(r.images);
                      return (
                        <li key={`${r.kind}-${r.id}`}>
                          <Link
                            to={r.kind === "luxury" ? "/luxury/$slug" : "/product/$slug"}
                            params={{ slug: r.slug }}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/[0.06]"
                          >
                            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/5">
                              {img ? (
                                <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-sm font-bold opacity-30">
                                  {r.name.charAt(0)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                {r.kind === "luxury" && (
                                  <Crown className="h-3 w-3 shrink-0 text-[color:var(--luxury-gold)]" />
                                )}
                                <span className="truncate text-sm font-medium">{r.name}</span>
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {r.brand ? `${r.brand} · ` : ""}SKU {r.sku ?? "—"}
                              </span>
                            </span>
                            <span className="shop-price shrink-0 text-sm">{formatCOP(r.price)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {q.trim().length >= 2 && results.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Sin resultados para “{q}”.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="search-pill" onClick={() => setOpen(true)}>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (!open) setOpen(true);
            }}
            placeholder="¿Qué quieres impulsar hoy?"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Buscar productos"
          />
          <span className="search-go">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </>
  );
}
