import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns the registration email of every user, keyed by user id.
 * Only super_admin / collaborator can call it: emails are PII.
 */
export const listUserEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);

    const isStaff = (roles ?? []).some(
      (r: { role: string }) => r.role === "super_admin" || r.role === "collaborator",
    );
    if (!isStaff) throw new Error("No autorizado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const emails: Record<string, string> = {};
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) if (u.email) emails[u.id] = u.email;
      if (data.users.length < 200) break;
      page += 1;
      if (page > 25) break;
    }
    return { emails };
  });
