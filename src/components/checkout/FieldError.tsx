import { AlertCircle } from "lucide-react";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

/** Clase de borde rojo para inputs con error. */
export function errorRing(message?: string) {
  return message ? " border-destructive focus-visible:ring-destructive" : "";
}
