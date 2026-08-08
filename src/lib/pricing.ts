export interface BundlePricing {
  price: number | string;
  bundle_pricing_enabled?: boolean | null;
  price_2?: number | string | null;
  price_3?: number | string | null;
}

const num = (v: unknown) => (v == null ? 0 : Number(v));

/** Total price for a given quantity, honoring 2-unit / 3-unit combo prices. */
export function bundleTotal(p: BundlePricing, quantity: number): number {
  const unit = num(p.price);
  const qty = Math.max(1, Math.floor(quantity || 1));
  if (!p.bundle_pricing_enabled) return round(unit * qty);

  const p2 = num(p.price_2) > 0 ? Number(p.price_2) : null;
  const p3 = num(p.price_3) > 0 ? Number(p.price_3) : null;

  if (qty === 2 && p2) return round(p2);
  if (qty === 3 && p3) return round(p3);

  // For larger quantities, build from the best available combo blocks.
  if (qty > 3 && (p2 || p3)) {
    let remaining = qty;
    let total = 0;
    if (p3) {
      const blocks = Math.floor(remaining / 3);
      total += blocks * p3;
      remaining -= blocks * 3;
    }
    if (p2 && remaining >= 2) {
      const blocks = Math.floor(remaining / 2);
      total += blocks * p2;
      remaining -= blocks * 2;
    }
    total += remaining * unit;
    return round(total);
  }

  return round(unit * qty);
}

export function bundleUnitLabel(p: BundlePricing, quantity: number): number {
  const total = bundleTotal(p, quantity);
  return round(total / Math.max(1, quantity));
}

const round = (n: number) => Math.round(n * 100) / 100;
