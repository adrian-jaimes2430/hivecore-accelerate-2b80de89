import { z } from "zod";

/**
 * Validación compartida de los datos de envío para todos los funnels
 * (públicos y de impulsador), con mensajes en español.
 */
export const checkoutFieldsSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(1, "Escribe los nombres y apellidos completos del cliente")
    .min(5, "Escribe nombres y apellidos completos (mínimo 5 caracteres)")
    .max(120, "El nombre es demasiado largo")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Falta el apellido"),
  client_phone: z
    .string()
    .trim()
    .min(1, "Escribe el teléfono / WhatsApp de contacto")
    .refine((v) => v.replace(/\D/g, "").length >= 7, "El teléfono parece incompleto")
    .refine((v) => v.replace(/\D/g, "").length <= 15, "El teléfono tiene demasiados dígitos"),
  client_email: z
    .string()
    .trim()
    .min(1, "Escribe el correo electrónico")
    .max(180, "El correo es demasiado largo")
    .email("El correo no es válido (ejemplo: nombre@correo.com)"),
  client_city: z
    .string()
    .trim()
    .min(1, "Escribe la ciudad de entrega")
    .min(2, "El nombre de la ciudad es muy corto")
    .max(80, "El nombre de la ciudad es demasiado largo"),
  client_region: z
    .string()
    .trim()
    .min(1, "Escribe el departamento o región")
    .min(2, "El departamento o región es muy corto")
    .max(80, "El departamento o región es demasiado largo"),
  client_address: z
    .string()
    .trim()
    .min(1, "Escribe la dirección de entrega")
    .min(8, "Agrega una dirección más completa (barrio, calle y número)")
    .max(300, "La dirección es demasiado larga"),
  quantity: z
    .number({ message: "Indica la cantidad" })
    .int("La cantidad debe ser un número entero")
    .min(1, "La cantidad mínima es 1")
    .max(50, "La cantidad máxima es 50"),
});

export type CheckoutFieldErrors = Partial<
  Record<keyof z.infer<typeof checkoutFieldsSchema>, string>
>;

/** Devuelve los errores por campo (vacío si todo está correcto). */
export function validateCheckoutFields(values: {
  client_name: string;
  client_phone: string;
  client_email: string;
  client_city: string;
  client_region: string;
  client_address: string;
  quantity: number;
}): CheckoutFieldErrors {
  const result = checkoutFieldsSchema.safeParse(values);
  if (result.success) return {};
  const errors: CheckoutFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof CheckoutFieldErrors;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export const CHECKOUT_FIELD_LABELS: Record<string, string> = {
  client_name: "Nombres y apellidos",
  client_phone: "Teléfono / WhatsApp",
  client_email: "Correo electrónico",
  client_city: "Ciudad",
  client_region: "Departamento / Región",
  client_address: "Dirección de entrega",
  quantity: "Cantidad",
};

/** Mensaje resumen para el toast. */
export function checkoutErrorSummary(errors: CheckoutFieldErrors): string {
  const names = Object.keys(errors).map((k) => CHECKOUT_FIELD_LABELS[k] ?? k);
  if (names.length === 1) return `Revisa este dato: ${names[0]}`;
  return `Faltan o están mal diligenciados ${names.length} datos: ${names.join(", ")}`;
}
