import { createServerFn } from "@tanstack/react-start";

export const getProductPublic = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id,slug,sku,name,price,upsell_price,bundle_pricing_enabled,price_2,price_3,short_description,description,benefits,images,funnel_sections,cta_label,is_active,category_id,secondary_category_ids,meta_pixel_enabled,meta_pixel_id,meta_test_event_code")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return row;
  });
