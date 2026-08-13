export const SITE_URL = "https://hivecore-shop.lovable.app";

export interface FeedItem {
  id: string;
  sku: string;
  type: "funnel" | "luxury";
  name: string;
  slug: string;
  url: string;
  description: string;
  brand: string;
  category: string | null;
  price: number;
  currency: "COP";
  price_formatted: string;
  availability: "in stock" | "out of stock";
  condition: "new";
  images: string[];
  image: string | null;
  videos?: string[];
  bundles?: { units: number; price: number }[];
  updated_at: string | null;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];

const clean = (v: unknown, fallback: string) => {
  const text = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return text.length > 0 ? text.slice(0, 4800) : fallback;
};

export const formatCOPFeed = (n: number) =>
  `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n))} COP`;

export async function loadPublicCatalog(): Promise<{
  brand: { name: string; site: string; about: string };
  generated_at: string;
  count: number;
  items: FeedItem[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: products }, { data: luxury }, { data: categories }, { data: luxCategories }, { data: brands }] =
    await Promise.all([
      supabaseAdmin
        .from("products")
        .select(
          "id,sku,name,slug,short_description,description,images,price,price_2,price_3,bundle_pricing_enabled,category_id,updated_at",
        )
        .eq("is_active", true)
        .limit(1000),
      supabaseAdmin
        .from("luxury_products")
        .select(
          "id,sku,name,slug,short_description,description,images,videos,suggested_retail_price,price,category_id,brand_id,stock_status,updated_at",
        )
        .eq("is_active", true)
        .limit(1000),
      supabaseAdmin.from("categories").select("id,name").limit(500),
      supabaseAdmin.from("luxury_categories").select("id,name").limit(500),
      supabaseAdmin.from("luxury_brands").select("id,name").limit(500),
    ]);

  const catName = new Map<string, string>();
  for (const c of categories ?? []) catName.set(c.id, c.name);
  const luxCatName = new Map<string, string>();
  for (const c of luxCategories ?? []) luxCatName.set(c.id, c.name);
  const brandName = new Map<string, string>();
  for (const b of brands ?? []) brandName.set(b.id, b.name);

  const items: FeedItem[] = [];

  for (const p of products ?? []) {
    const images = asArray(p.images);
    const price = Number(p.price);
    const bundles: { units: number; price: number }[] = [];
    if (p.bundle_pricing_enabled) {
      if (Number(p.price_2) > 0) bundles.push({ units: 2, price: Number(p.price_2) });
      if (Number(p.price_3) > 0) bundles.push({ units: 3, price: Number(p.price_3) });
    }
    items.push({
      id: p.id,
      sku: p.sku,
      type: "funnel",
      name: p.name,
      slug: p.slug,
      url: `${SITE_URL}/product/${p.slug}`,
      description: clean(p.short_description ?? p.description, `${p.name} disponible en HIVECORE con pago contra entrega en Colombia.`),
      brand: "HIVECORE",
      category: p.category_id ? catName.get(p.category_id) ?? null : null,
      price,
      currency: "COP",
      price_formatted: formatCOPFeed(price),
      availability: "in stock",
      condition: "new",
      images,
      image: images[0] ?? null,
      bundles: bundles.length > 0 ? bundles : undefined,
      updated_at: p.updated_at ?? null,
    });
  }

  for (const p of luxury ?? []) {
    const images = asArray(p.images);
    const price = Number(p.suggested_retail_price) > 0 ? Number(p.suggested_retail_price) : Number(p.price);
    items.push({
      id: p.id,
      sku: p.sku ?? p.slug,
      type: "luxury",
      name: p.name,
      slug: p.slug,
      url: `${SITE_URL}/catalogo/${p.slug}`,
      description: clean(p.short_description ?? p.description, `${p.name} — pieza premium de AnMa Luxury Collection.`),
      brand: p.brand_id ? brandName.get(p.brand_id) ?? "AnMa Luxury" : "AnMa Luxury",
      category: p.category_id ? luxCatName.get(p.category_id) ?? null : null,
      price,
      currency: "COP",
      price_formatted: formatCOPFeed(price),
      availability: p.stock_status === "out_of_stock" ? "out of stock" : "in stock",
      condition: "new",
      images,
      image: images[0] ?? null,
      videos: asArray(p.videos),
      updated_at: p.updated_at ?? null,
    });
  }

  return {
    brand: {
      name: "HIVECORE — A&O Ecosystem",
      site: SITE_URL,
      about:
        "HIVECORE es la plataforma comercial de Company A&O en Colombia. Vendemos productos de consumo y tecnología con pago contra entrega, y la línea premium AnMa Luxury Collection (perfumería, relojería, joyería AAA y marroquinería). Precios en pesos colombianos (COP), envíos a todo el país.",
    },
    generated_at: new Date().toISOString(),
    count: items.length,
    items,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildProductXmlFeed(data: Awaited<ReturnType<typeof loadPublicCatalog>>) {
  const entries = data.items
    .map((i) => {
      const extra = i.images.slice(1, 11).map((u) => `      <g:additional_image_link>${esc(u)}</g:additional_image_link>`).join("\n");
      return `    <item>
      <g:id>${esc(i.sku)}</g:id>
      <g:title>${esc(i.name)}</g:title>
      <g:description>${esc(i.description)}</g:description>
      <g:link>${esc(i.url)}</g:link>
      ${i.image ? `<g:image_link>${esc(i.image)}</g:image_link>` : ""}
${extra}
      <g:brand>${esc(i.brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${i.availability === "in stock" ? "in stock" : "out of stock"}</g:availability>
      <g:price>${i.price.toFixed(2)} COP</g:price>
      ${i.category ? `<g:product_type>${esc(i.category)}</g:product_type>` : ""}
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(data.brand.name)} — Catálogo</title>
    <link>${esc(data.brand.site)}</link>
    <description>${esc(data.brand.about)}</description>
${entries}
  </channel>
</rss>`;
}
