import { createServerFn } from "@tanstack/react-start";

export const getProductPublic = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id,slug,sku,name,price,upsell_price,short_description,description,benefits,images,funnel_sections,cta_label,is_active")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return row;
  });
