import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

export const deleteImpulsador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");

    const { data: callerRoles, error: callerError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (callerError) throw new Error(callerError.message);
    if (!(callerRoles ?? []).some((row) => row.role === "super_admin")) throw new Error("No autorizado");

    const { data: targetRoles, error: targetRoleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if (targetRoleError) throw new Error(targetRoleError.message);
    if (!(targetRoles ?? []).some((row) => row.role === "impulsador")) {
      throw new Error("Solo se pueden eliminar cuentas con rol Impulsador");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile, error: profileError }, { data: authData, error: authError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name,phone").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(data.userId),
    ]);
    if (profileError) throw new Error(profileError.message);
    if (authError) throw new Error(authError.message);

    const { error: preserveError } = await supabaseAdmin
      .from("orders")
      .update({
        impulsador_deleted_id: data.userId,
        impulsador_deleted_name: profile?.full_name ?? null,
        impulsador_deleted_email: authData.user.email ?? null,
        impulsador_deleted_phone: profile?.phone ?? null,
        impulsador_id: null,
      })
      .eq("impulsador_id", data.userId);
    if (preserveError) throw new Error(`No fue posible conservar las ventas: ${preserveError.message}`);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (deleteError) throw new Error(deleteError.message);
    return { ok: true };
  });
