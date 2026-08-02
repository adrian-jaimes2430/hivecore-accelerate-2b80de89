import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { readPublicOrderStatus } from "@/lib/checkout.functions";
import { Check, Clock, XCircle, Truck } from "lucide-react";

const searchSchema = z.object({
  ref: fallback(z.string(), "").default(""),
  id: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/gracias")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ ref: search.ref }),
  loader: async ({ deps }) => {
    if (!deps.ref) return { order: null };
    const order = await readPublicOrderStatus({ data: { reference: deps.ref } });
    return { order };
  },
  errorComponent: () => (
    <Shell title="Gracias por tu pedido">
      <p className="text-muted-foreground">
        No pudimos cargar el estado del pedido en este momento, pero tu solicitud quedó registrada.
      </p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell title="Gracias por tu pedido">
      <p className="text-muted-foreground">Pedido no encontrado.</p>
    </Shell>
  ),
  head: () => ({
    meta: [
      { title: "Pedido confirmado — HIVECORE" },
      {
        name: "description",
        content:
          "Confirmación de tu pedido en HIVECORE: revisa el código, el estado del pago y los próximos pasos de entrega.",
      },
      { property: "og:title", content: "Pedido confirmado — HIVECORE" },
      {
        property: "og:description",
        content: "Tu pedido HIVECORE quedó registrado. Consulta el estado de pago y entrega.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GraciasPage,
});

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold hive-gradient-text">{title}</h1>
      <div className="mt-6 space-y-4">{children}</div>
      <Link to="/" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground">
        Volver al inicio
      </Link>
    </main>
  );
}

function GraciasPage() {
  const { order } = Route.useLoaderData();

  if (!order) {
    return (
      <Shell title="Gracias por tu pedido">
        <p className="text-muted-foreground">
          Recibimos tu solicitud. Nuestro equipo te contactará para confirmar la entrega.
        </p>
      </Shell>
    );
  }

  const paid = order.payment_status === "paid";
  const failed = order.payment_status === "failed" || order.payment_status === "voided";
  const cod = order.payment_method === "cod";

  return (
    <Shell title={paid ? "¡Pago confirmado!" : failed ? "Pago no completado" : "Pedido recibido"}>
      <div className="hive-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
              paid
                ? "bg-emerald-500/15 text-emerald-400"
                : failed
                  ? "bg-red-500/15 text-red-400"
                  : "bg-hive/15 text-hive"
            }`}
          >
            {paid ? (
              <Check className="h-5 w-5" />
            ) : failed ? (
              <XCircle className="h-5 w-5" />
            ) : cod ? (
              <Truck className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Código</p>
            <p className="font-display text-2xl font-bold hive-gradient-text">{order.order_code}</p>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Cliente" value={order.client_name} />
          <Row label="Cantidad" value={String(order.quantity)} />
          <Row label="Total" value={`$ ${Number(order.total ?? 0).toFixed(2)}`} />
          <Row
            label="Método de pago"
            value={cod ? "Contra entrega" : "Pago en línea (Wompi)"}
          />
          <Row
            label="Estado del pago"
            value={
              paid
                ? "Aprobado"
                : failed
                  ? "Rechazado"
                  : cod
                    ? "Se paga al recibir"
                    : "En verificación"
            }
          />
        </dl>
      </div>
      <p className="text-sm text-muted-foreground">
        {failed
          ? "Tu pago no fue aprobado. Puedes volver al producto e intentar de nuevo o elegir pago contra entrega."
          : "Te contactaremos por WhatsApp para coordinar la entrega."}
      </p>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
