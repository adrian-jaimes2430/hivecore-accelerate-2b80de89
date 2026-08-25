import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, ArrowRight, Crown } from "lucide-react";
import { formatCOP } from "@/lib/pricing";

export interface DockItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  short_description: string | null;
  images: unknown;
  brand: string | null;
  category: string | null;
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

/** Buscador flotante inferior del catálogo público Luxury (igual al catálogo base). */
export function LuxurySearchDock({ items, refId }: { items: DockItem[]; refId?: string }) {
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

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const words = term.split(/\s+/);
    return items
      .filter((r) => {
        const hay = [r.name, r.short_description, r.sku, r.brand, r.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 24);
  }, [items, q]);

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

            <ul className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
              {results.map((r) => {
                const img = firstImage(r.images);
                return (
                  <li key={r.id}>
                    <Link
                      to="/catalogo/$slug"
                      params={{ slug: r.slug }}
                      search={refId ? { ref: refId } : {}}
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
                          <Crown className="h-3 w-3 shrink-0 text-[color:var(--luxury-gold)]" />
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

              {q.trim().length >= 2 && results.length === 0 && (
                <li className="px-2 py-6 text-center text-sm text-muted-foreground">Sin resultados para “{q}”.</li>
              )}
            </ul>
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
            placeholder="¿Qué pieza estás buscando?"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Buscar piezas"
          />
          <span className="search-go">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </>
  );
}
