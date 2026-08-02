import { createHash } from "crypto";

export type WompiConfig = {
  publicKey: string;
  privateKey: string | null;
  integritySecret: string;
  eventsSecret: string | null;
  checkoutBase: string;
  currency: string;
};

export function getWompiConfig(): WompiConfig | null {
  const publicKey = process.env["WOMPI_PUBLIC_KEY"];
  const integritySecret = process.env["WOMPI_INTEGRITY_SECRET"];
  if (!publicKey || !integritySecret) return null;
  return {
    publicKey,
    privateKey: process.env["WOMPI_PRIVATE_KEY"] ?? null,
    integritySecret,
    eventsSecret: process.env["WOMPI_EVENTS_SECRET"] ?? null,
    checkoutBase: process.env["WOMPI_CHECKOUT_URL"] ?? "https://checkout.wompi.co/p/",
    currency: process.env["WOMPI_CURRENCY"] ?? "COP",
  };
}

/** Wompi integrity signature: SHA256(reference + amountInCents + currency + integritySecret) */
export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string,
) {
  return createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest("hex");
}

export function buildCheckoutUrl(opts: {
  cfg: WompiConfig;
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  const { cfg } = opts;
  const params = new URLSearchParams();
  params.set("public-key", cfg.publicKey);
  params.set("currency", cfg.currency);
  params.set("amount-in-cents", String(opts.amountInCents));
  params.set("reference", opts.reference);
  params.set(
    "signature:integrity",
    integritySignature(opts.reference, opts.amountInCents, cfg.currency, cfg.integritySecret),
  );
  params.set("redirect-url", opts.redirectUrl);
  if (opts.email) params.set("customer-data:email", opts.email);
  if (opts.fullName) params.set("customer-data:full-name", opts.fullName);
  if (opts.phone) params.set("customer-data:phone-number", opts.phone);
  if (opts.address) params.set("shipping-address:address-line-1", opts.address);
  return `${cfg.checkoutBase}?${params.toString()}`;
}

/** Read a dotted path (e.g. "transaction.status") out of the event payload. */
function readPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj as any);
}

/**
 * Wompi events checksum: SHA256(concat(signature.properties values) + timestamp + eventsSecret)
 */
export function verifyEventChecksum(body: any, eventsSecret: string): boolean {
  const props: string[] = body?.signature?.properties ?? [];
  const checksum: string | undefined = body?.signature?.checksum;
  if (!Array.isArray(props) || props.length === 0 || !checksum) return false;
  const concatenated = props.map((p) => String(readPath(body?.data, p) ?? "")).join("");
  const expected = createHash("sha256")
    .update(`${concatenated}${body?.timestamp ?? ""}${eventsSecret}`)
    .digest("hex")
    .toUpperCase();
  return expected === String(checksum).toUpperCase();
}

export function mapWompiStatus(status: string): {
  payment_status: "pending" | "paid" | "failed" | "voided";
  order_status: "pending" | "confirmed" | "cancelled" | null;
} {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
      return { payment_status: "paid", order_status: "confirmed" };
    case "DECLINED":
    case "ERROR":
      return { payment_status: "failed", order_status: "cancelled" };
    case "VOIDED":
      return { payment_status: "voided", order_status: "cancelled" };
    default:
      return { payment_status: "pending", order_status: null };
  }
}
