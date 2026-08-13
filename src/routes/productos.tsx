import { createFileRoute, Link } from "@tanstack/react-router";
import { listPublicCatalog } from "@/lib/public-catalog.functions";
import { formatCOP } from "@/lib/pricing";

const SITE_URL = "https://hivecore-shop.lovable.app";

export const Route = createFileRoute("/productos")({
  loader: () => listPublicCatalog(),
  component: ProductIndex,
  head: () => ({
    meta: [
      { title: "Catálogo completo de productos — HIVECORE Colombia" },
      {
        name: "description",
        content:
          "Índice público de todos los productos HIVECORE y AnMa Luxury: precios en COP, disponibilidad y enlaces directos. Actualizado en tiempo real.",
      },
      { property: "og:title", content: "Catálogo completo de productos — HIVECORE Colombia" },
      {
        property: "og:description",
        content: "Todos nuestros productos con precio en pesos colombianos, disponibilidad y enlace directo de compra.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/productos` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/productos` }],
  }),
});

function ProductIndex() {
  const data = Route.useLoaderData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Catálogo HIVECORE",
    numberOfItems: data.items.length,
    itemListElement: data.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: item.name,
        sku: item.sku,
        description: item.description,
        brand: { "@type": "Brand", name: item.brand },
        image: item.images.slice(0, 5),
        url: item.url,
        offers: {
          "@type": "Offer",
          priceCurrency: "COP",
          price: item.price,
          availability:
            item.availability === "in stock"
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: item.url,
        },
      },
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-hive">HIVECORE · A&amp;O Ecosystem</p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Catálogo completo de productos</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.brand.about}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {data.items.length} productos activos · precios en pesos colombianos (COP) · datos legibles por máquina en{" "}
          <a className="text-hive underline" href="/api/public/catalog">
            /api/public/catalog
          </a>{" "}
          y{" "}
          <a className="text-hive underline" href="/api/public/catalog-feed">
            /api/public/catalog-feed
          </a>
          .
        </p>
      </header>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <li key={`${item.type}-${item.id}`} className="shop-card overflow-hidden p-0">
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="text-base font-semibold leading-snug">{item.name}</h2>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              <p className="mt-3 font-display text-lg font-bold hive-gradient-text">{formatCOP(item.price)}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {item.brand}
                {item.category ? ` · ${item.category}` : ""} · SKU {item.sku}
              </p>
              {item.type === "funnel" ? (
                <Link
                  to="/product/$slug"
                  params={{ slug: item.slug }}
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-hive/15 px-4 text-xs font-semibold text-hive"
                >
                  Ver producto
                </Link>
              ) : (
                <Link
                  to="/catalogo/$slug"
                  params={{ slug: item.slug }}
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-hive/15 px-4 text-xs font-semibold text-hive"
                >
                  Ver producto
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
