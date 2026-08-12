import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Package } from "lucide-react";
import { formatCOP } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Pedidos — HIVECORE" }] }),
});

interface Order {
  id: string; order_code: string; client_name: string; client_phone: string;
  client_email: string | null; client_address: string | null;
  client_city: string | null; client_region: string | null;
  quantity: number; total: number | null; status: string; created_at: string;
  product_id: string | null;
}


function OrdersPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Package className="h-6 w-6 text-hive" />
        <h1 className="font-display text-3xl font-bold">Mis pedidos</h1>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-hive" /></div>
      ) : orders.length === 0 ? (
        <div className="hive-card p-10 text-center text-muted-foreground">
          Aún no has generado pedidos. Abre cualquier producto del catálogo y crea tu primera orden.
        </div>
      ) : (
        <div className="hive-card overflow-hidden">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Envío (dirección / ciudad / región)</th>
                <th className="px-4 py-3">Cant.</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-hive">{o.order_code}</td>
                  <td className="px-4 py-3">{o.client_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>{o.client_phone}</div>
                    {o.client_email && <div className="text-[10px]">{o.client_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{o.client_address || "—"}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {[o.client_city, o.client_region].filter(Boolean).join(" · ") || "Sin ciudad/región"}
                    </div>
                  </td>

                  <td className="px-4 py-3">{o.quantity}</td>
                  <td className="px-4 py-3">{formatCOP(Number(o.total ?? 0))}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-anma-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase text-anma-orange">{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
