import { createServerFn } from "@tanstack/react-start";

const serverClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};

export const listLuxuryCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await serverClient();
  const [{ data: products }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from("luxury_products")
      .select("id,sku,name,slug,short_description,images,category_id,brand_id,price,suggested_retail_price,stock_status,stock_quantity,is_featured,attributes")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("luxury_categories").select("id,name,slug,parent_id,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("luxury_brands").select("id,name,slug").eq("is_active", true).order("sort_order"),
  ]);
  return {
    products: products ?? [],
    categories: categories ?? [],
    brands: brands ?? [],
  };
});

export const getLuxuryProductPublic = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await serverClient();
    const { data: product } = await supabase
      .from("luxury_products")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!product) return null;
    const [{ data: brand }, { data: category }] = await Promise.all([
      product.brand_id
        ? supabase.from("luxury_brands").select("name,slug").eq("id", product.brand_id).maybeSingle()
        : Promise.resolve({ data: null }),
      product.category_id
        ? supabase.from("luxury_categories").select("name,slug").eq("id", product.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return { product, brand: brand ?? null, category: category ?? null };
  });

export const getImpulsadorRef = createServerFn({ method: "GET" })
  .inputValidator((d: { ref: string }) => d)
  .handler(async ({ data }) => {
    const supabase = await serverClient();
    const { data: row } = await supabase
      .from("profiles")
      .select("id,full_name,phone,status")
      .eq("id", data.ref)
      .eq("status", "approved")
      .maybeSingle();
    if (!row) return null;
    return { id: row.id, name: row.full_name, phone: row.phone };
  });
