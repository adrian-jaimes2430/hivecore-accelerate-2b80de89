/** Número oficial de HIVECORE / AnMa Luxury para pedidos sin impulsador asignado. */
export const DEFAULT_WHATSAPP = "573106807521";

export function waHref(phone: string | null | undefined, text: string) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  const target = digits.length >= 8 ? digits : DEFAULT_WHATSAPP;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
