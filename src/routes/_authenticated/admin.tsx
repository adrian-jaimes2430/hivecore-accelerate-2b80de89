import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Users, ShoppingBag, BarChart3, Check, Ban, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — HIVECORE" }] }),
});

interface ProfileRow { id: string; full_name: string | null; phone: string | null; status: string; created_at: string }

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/app" });
  }, [loading, isAdmin, navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const { data: orderCount = 0 } = useQuery({
    queryKey: ["admin-orders-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["admin-products-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const setStatus = async (id: string, status: "approved" | "blocked" | "pending") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Estado actualizado");
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  if (!isAdmin) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>;
  }

  const pending = profiles.filter((p) => p.status === "pending");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-hive" />
        <h1 className="font-display text-3xl font-bold">Panel administrativo</h1>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-4">
        <Metric icon={Users} label="Impulsadores" value={profiles.length} accent="text-hive" />
        <Metric icon={Users} label="Pendientes" value={pending.length} accent="text-anma-orange" />
        <Metric icon={ShoppingBag} label="Productos" value={productCount} accent="text-ao-red" />
        <Metric icon={BarChart3} label="Pedidos" value={orderCount} accent="text-hive" />
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Gestión de impulsadores</h2>
        <div className="hive-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-medium">{p.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusChip(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {p.status !== "approved" && (
                      <Button size="sm" onClick={() => setStatus(p.id, "approved")} className="hive-btn-primary mr-2 h-8 border-0">
                        <Check className="mr-1 h-3 w-3" /> Aprobar
                      </Button>
                    )}
                    {p.status !== "blocked" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "blocked")} className="h-8 border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20">
                        <Ban className="mr-1 h-3 w-3" /> Bloquear
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="hive-card p-5">
      <Icon className={`h-5 w-5 ${accent}`} />
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function statusChip(s: string) {
  if (s === "approved") return "bg-hive/15 text-hive";
  if (s === "blocked") return "bg-destructive/15 text-destructive";
  return "bg-anma-orange/15 text-anma-orange";
}
