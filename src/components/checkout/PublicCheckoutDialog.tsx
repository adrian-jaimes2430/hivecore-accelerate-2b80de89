import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Truck, Loader2, ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import { submitPublicOrder } from "@/lib/checkout.functions";
import { bundleTotal, type BundlePricing } from "@/lib/pricing";
import { metaTrack } from "@/components/marketing/MetaPixel";

export function PublicCheckoutDialog({
  productKind,
  slug,
  productName,
  unitPrice,
  pricing,
  currencyPrefix = "$",
  ctaLabel = "Comprar ahora",
  ref: refId,
  variations,
  triggerClassName = "shop-btn-accent h-12 border-0 px-6 text-base",
}: {
  productKind: "funnel" | "luxury";
  slug: string;
  productName: string;
  unitPrice: number;
  pricing?: BundlePricing | null;
  currencyPrefix?: string;
  ctaLabel?: string;
  ref?: string | null;
  variations?: string | null;
  triggerClassName?: string;
}) {
  const submit = useServerFn(submitPublicOrder);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; method: "cod" | "online" } | null>(null);
  const [method, setMethod] = useState<"cod" | "online">("cod");
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    client_address: "",
    client_city: "",
    client_region: "",
    quantity: 1,
    notes: "",
  });


  const priceModel: BundlePricing = pricing ?? { price: unitPrice };
  const comboEnabled = Boolean(
    priceModel.bundle_pricing_enabled && (Number(priceModel.price_2) > 0 || Number(priceModel.price_3) > 0),
  );
  const total = bundleTotal(priceModel, form.quantity);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res: any = await submit({
        data: {
          productKind,
          slug,
          quantity: form.quantity,
          client_name: form.client_name,
          client_phone: form.client_phone,
          client_email: form.client_email || null,
          client_address: form.client_address,
          client_city: form.client_city || null,
          client_region: form.client_region || null,

          notes: form.notes || null,
          variations: variations || null,
          payment_method: method,
          ref: refId || null,
          origin: typeof window !== "undefined" ? window.location.search.slice(0, 200) : null,
        },
      });
      if (!res?.ok) {
        if (res?.error === "wompi_not_configured") {
          toast.error("El pago en línea aún no está habilitado. Elige pago contra entrega.");
        } else {
          toast.error("No se pudo registrar el pedido. Intenta de nuevo.");
        }
        setBusy(false);
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setDone({ code: res.orderCode, method });
    } catch (err: any) {
      toast.error(err?.message ?? "Error al enviar el pedido");
    }
    setBusy(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setDone(null);
        if (o) {
          metaTrack("InitiateCheckout", {
            content_ids: [slug],
            content_name: productName,
            content_type: "product",
            num_items: form.quantity,
            value: total,
            currency: "COP",
          });
        }
      }}
    >

      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <ShoppingBag className="mr-2 h-4 w-4" /> {ctaLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-surface-elevated border-border/60">
        <DialogHeader>
          <DialogTitle>Finalizar pedido · {productName}</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-hive/15 text-hive">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              ¡Gracias! Tu pedido fue recibido con el código:
            </p>
            <p className="font-display text-3xl font-bold hive-gradient-text">{done.code}</p>
            <p className="text-sm text-muted-foreground">
              Pagarás <strong>contra entrega</strong> al recibir el producto. Te contactaremos por
              WhatsApp para confirmar la entrega.
            </p>
            <Button onClick={() => setOpen(false)} className="hive-btn-primary border-0">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cod")}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  method === "cod"
                    ? "border-hive bg-hive/10"
                    : "border-border/60 bg-white/5 hover:border-hive/40"
                }`}
              >
                <Truck className="mb-1 h-4 w-4 text-hive" />
                <span className="block font-semibold">Pago contra entrega</span>
                <span className="block text-xs text-muted-foreground">Pagas al recibir</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("online")}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  method === "online"
                    ? "border-hive bg-hive/10"
                    : "border-border/60 bg-white/5 hover:border-hive/40"
                }`}
              >
                <CreditCard className="mb-1 h-4 w-4 text-hive" />
                <span className="block font-semibold">Pagar ahora</span>
                <span className="block text-xs text-muted-foreground">
                  Tarjeta, PSE, Nequi
                </span>
              </button>
            </div>

            <div>
              <Label>Nombre completo</Label>
              <Input
                required
                minLength={2}
                maxLength={120}
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                className="bg-white/5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp / Teléfono</Label>
                <Input
                  required
                  minLength={6}
                  maxLength={30}
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="bg-white/5"
                />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="bg-white/5"
                />
              </div>
            </div>

            {comboEnabled && (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((q) => {
                  const t = bundleTotal(priceModel, q);
                  const available = q === 1 || (q === 2 ? Number(priceModel.price_2) > 0 : Number(priceModel.price_3) > 0);
                  if (!available) return null;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setForm({ ...form, quantity: q })}
                      className={`rounded-lg border p-2 text-center text-xs transition ${
                        form.quantity === q
                          ? "border-hive bg-hive/10"
                          : "border-border/60 bg-white/5 hover:border-hive/40"
                      }`}
                    >
                      <span className="block font-semibold">{q} unidad{q > 1 ? "es" : ""}</span>
                      <span className="block hive-gradient-text font-bold">
                        {currencyPrefix} {t.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div>
              <Label>Correo electrónico {method === "online" ? "" : "(opcional)"}</Label>
              <Input
                type="email"
                required={method === "online"}
                maxLength={180}
                value={form.client_email}
                onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                className="bg-white/5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ciudad</Label>
                <Input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.client_city}
                  onChange={(e) => setForm({ ...form, client_city: e.target.value })}
                  className="bg-white/5"
                />
              </div>
              <div>
                <Label>Departamento / Región</Label>
                <Input
                  maxLength={80}
                  placeholder="Opcional"
                  value={form.client_region}
                  onChange={(e) => setForm({ ...form, client_region: e.target.value })}
                  className="bg-white/5"
                />
              </div>
            </div>
            <div>
              <Label>Dirección de entrega (barrio, calle, número)</Label>
              <Input
                required
                minLength={4}
                maxLength={300}
                value={form.client_address}
                onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                className="bg-white/5"
              />
            </div>

            <div>
              <Label>Observaciones (opcional)</Label>
              <Textarea
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-white/5"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white/5 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="font-display text-xl font-bold hive-gradient-text">
                {currencyPrefix} {total.toFixed(2)}
              </span>
            </div>

            <Button type="submit" disabled={busy} className="hive-btn-primary h-11 w-full border-0">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : method === "online" ? (
                "Ir a pagar"
              ) : (
                "Confirmar pedido contra entrega"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {method === "online"
                ? "Serás redirigido a la pasarela segura de Wompi."
                : "Sin pago anticipado: pagas cuando recibas tu producto."}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
