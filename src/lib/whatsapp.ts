/** Número oficial de HIVECORE / A&O para pedidos sin impulsador asignado. */
export const DEFAULT_WHATSAPP = "573106807521";

/** Número oficial de AnMa Luxury Collection. */
export const ANMA_WHATSAPP = "573058023023";

export function waHref(phone: string | null | undefined, text: string) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  const target = digits.length >= 8 ? digits : DEFAULT_WHATSAPP;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

/** Quita parámetros de tracking (fbclid, utm_*, ref) para links cortos y legibles. */
export function cleanUrl(raw: string) {
  try {
    const u = new URL(raw);
    const keep = new URLSearchParams();
    u.searchParams.forEach((v, k) => {
      if (!/^(fbclid|gclid|ttclid|msclkid|ref)$/i.test(k) && !/^utm_/i.test(k)) keep.set(k, v);
    });
    const qs = keep.toString();
    return `${u.origin}${u.pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return raw;
  }
}

/** Mensaje optimizado de interés por un producto (alta conversión, sin links largos). */
export function productInquiryMessage(productName: string) {
  return `Hola 😊 Me interesa el ${productName} ✨. Vi la información en el anuncio y quisiera conocer el precio, cómo funciona y qué incluye.`;
}

/** Mensaje optimizado para solicitar el pedido de un producto. */
export function productOrderMessage(productName: string, extra?: { price?: string; options?: string | null; url?: string }) {
  const lines = [
    `Hola 😊 Quiero pedir el ${productName} ✨.`,
    extra?.price ? `Vi que su precio es ${extra.price}.` : null,
    extra?.options ? `Opciones: ${extra.options}.` : null,
    "¿Me confirmas disponibilidad, tiempo de entrega y si puedo pagar contra entrega?",
    extra?.url ? cleanUrl(extra.url) : null,
  ].filter(Boolean);
  return lines.join("\n");
}
